/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type CompiledRule } from '../../places/induced-rules.js';
import { type Instance } from './instances.js';
import { correctCount, indexOf, type Verdict, verdictsOf } from './scoring.js';

// What a rule must do to be in force (P07 ticket 07). The gate is RuleChef's (research note 11 §3.2): a change is
// kept only when the held-out words do not get worse, every rule carries what it fixed and broke, and leave-one-out
// retires a rule the set is as good without. The criteria are ASI's (note 11 §3.3): the rule fixed an instance,
// fired on it and changed the answer. A rule must fix two distinct words of two distinct accounts, the held-out words
// counting (a fix there is a words the reflector never saw), and break no instance, training or held out: one words
// is an alias, which tickets 03 and 06 learn. At most 50 rules stay in force, those that fix most (WALL-E 2.0's budget).

export const MIN_FIXED_WORDS = 2;
export const MIN_FIXED_ACCOUNTS = 2;
export const MAX_ACTIVE_RULES = 50;

export interface Standing {
  rule: CompiledRule;
  // Distinct words, training and held out, wrong without the rule and right with it, and instances right without and
  // wrong with it.
  fixed: number;
  broke: number;
  // Distinct accounts behind the fixed words.
  accounts: number;
  // Right held-out instances with the rule, less those without it.
  heldOutGain: number;
  // One fixed words, for people.
  example: string | null;
}

function changed(before: readonly Verdict[], after: readonly Verdict[], from: boolean): number[] {
  return before.flatMap((verdict, index) =>
    verdict.correct === from && after[index]?.correct === !from ? [index] : [],
  );
}

// How the rule stands on top of the others.
export async function standingOf(
  places: readonly PlaceDto[],
  others: readonly CompiledRule[],
  rule: CompiledRule,
  train: readonly Instance[],
  heldOut: readonly Instance[],
): Promise<Standing> {
  const without = indexOf(places, others);
  const withRule = indexOf(places, [...others, rule]);
  const [trainBefore, trainAfter, heldBefore, heldAfter] = await Promise.all([
    verdictsOf(without, train),
    verdictsOf(withRule, train),
    verdictsOf(without, heldOut),
    verdictsOf(withRule, heldOut),
  ]);
  const fixed = [
    ...changed(trainBefore, trainAfter, false).map((index) => train[index]),
    ...changed(heldBefore, heldAfter, false).map((index) => heldOut[index]),
  ].filter((instance) => instance !== undefined);
  return {
    rule,
    fixed: new Set(fixed.map(({ words }) => words)).size,
    broke: changed(trainBefore, trainAfter, true).length + changed(heldBefore, heldAfter, true).length,
    accounts: new Set(fixed.flatMap(({ accounts }) => accounts)).size,
    heldOutGain: correctCount(heldAfter) - correctCount(heldBefore),
    example: fixed[0]?.words ?? null,
  };
}

export function passes({ fixed, broke, accounts, heldOutGain }: Standing): boolean {
  return fixed >= MIN_FIXED_WORDS && accounts >= MIN_FIXED_ACCOUNTS && broke === 0 && heldOutGain >= 0;
}

// The proposed rules tried one at a time on top of the rules in force, each promoted one joining them for the next.
export async function promote(
  places: readonly PlaceDto[],
  active: readonly CompiledRule[],
  proposed: readonly CompiledRule[],
  train: readonly Instance[],
  heldOut: readonly Instance[],
): Promise<{ promoted: Standing[]; refused: Standing[] }> {
  const inForce = [...active];
  const promoted: Standing[] = [];
  const refused: Standing[] = [];
  for (const rule of proposed) {
    // oxlint-disable-next-line no-await-in-loop -- each rule is judged on top of those promoted before it
    const standing = await standingOf(places, inForce, rule, train, heldOut);
    if (passes(standing)) {
      promoted.push(standing);
      inForce.push(rule);
    } else {
      refused.push(standing);
    }
  }
  return { promoted, refused };
}

// Every rule in force counted again by leave-one-out, newest first: one the rest are as good without, or that breaks
// an instance, retires; then the budget keeps those that fix most.
export async function audit(
  places: readonly PlaceDto[],
  active: readonly CompiledRule[],
  train: readonly Instance[],
  heldOut: readonly Instance[],
): Promise<{ kept: Standing[]; retired: Standing[] }> {
  const inForce = [...active];
  const kept: Standing[] = [];
  const retired: Standing[] = [];
  for (const rule of active.toReversed()) {
    const others = inForce.filter((other) => other !== rule);
    // oxlint-disable-next-line no-await-in-loop -- each rule is judged among those still in force
    const standing = await standingOf(places, others, rule, train, heldOut);
    if (standing.fixed === 0 || standing.broke > 0) {
      retired.push(standing);
      inForce.splice(inForce.indexOf(rule), 1);
    } else {
      kept.push(standing);
    }
  }
  kept.sort((a, b) => b.fixed - a.fixed || active.indexOf(a.rule) - active.indexOf(b.rule));
  retired.push(...kept.splice(MAX_ACTIVE_RULES));
  kept.sort((a, b) => active.indexOf(a.rule) - active.indexOf(b.rule));
  return { kept, retired };
}
