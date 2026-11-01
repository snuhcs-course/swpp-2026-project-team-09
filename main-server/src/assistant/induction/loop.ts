/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import { normaliseWords } from '../../common/normalise-words.js';
import { abbreviations } from '../../places/abbreviations.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type CompiledRule, compileRule, type RuleText } from '../../places/induced-rules.js';
import { type Instance } from './instances.js';
import { type Candidate, paretoFront, sampleFront, sampleSome, seededRandom } from './pareto.js';
import { type Failure, type Proposal, type Reflector } from './reflector.js';
import { correctCount, indexOf, type Verdict, verdictsOf } from './scoring.js';

// GEPA's loop over rule sets (Agrawal et al., ICLR 2026, research note 11 §3.1): a parent is sampled from the Pareto
// front, up to six of its failures go to the reflector, each rule it proposes becomes a child kept only when it is
// right on more of that minibatch than the parent, and a kept child is then scored on every training instance. The
// paper's Merge of lineages is left out, as it hurt at times there. Seeded, so a run repeats given the reflector's
// answers. The gate (gate.ts) decides afterwards what the best candidate's rules may do in force.

export const MINIBATCH = 6;
// A name rule fitting more than this share of the catalog's names writes forms for most Places: RuleChef's refusal of
// patterns that match generic text.
const GENERIC_SHARE = 0.3;

export interface ProposalOutcome extends Proposal {
  // `kept`, or why not.
  outcome: string;
}

export interface Attempt {
  call: number;
  parentRules: number;
  // The words of the minibatch.
  minibatch: string[];
  proposals: ProposalOutcome[];
  // What was wrong with the reflector's answer, when something was.
  note: string | null;
}

export interface Evolution {
  best: Candidate;
  candidates: number;
  attempts: Attempt[];
}

export interface LoopOptions {
  places: readonly PlaceDto[];
  instances: readonly Instance[];
  // The rules in force, the root candidate.
  root: readonly CompiledRule[];
  reflector: Reflector;
  // How many times the reflector is asked.
  budget: number;
  seed: number;
}

export function sameRule(a: RuleText, b: RuleText): boolean {
  return a.kind === b.kind && a.pattern === b.pattern && a.replace === b.replace;
}

async function candidateOf(
  places: readonly PlaceDto[],
  rules: readonly CompiledRule[],
  instances: readonly Instance[],
): Promise<Candidate> {
  return { rules: [...rules], verdicts: await verdictsOf(indexOf(places, rules), instances) };
}

function failureOf(names: ReadonlyMap<string, string>, instance: Instance, verdict: Verdict): Failure {
  const name = names.get(instance.placeId) ?? instance.placeId;
  const nameOf = (id: string): string => names.get(id) ?? id;
  let answer: Failure['answer'] = { result: 'none' };
  if (verdict.answer.result === 'one') {
    answer = { result: 'one', name: nameOf(verdict.answer.candidateIds[0] ?? '') };
  } else if (verdict.answer.result === 'several') {
    answer = { result: 'several', names: verdict.answer.candidateIds.map(nameOf) };
  }
  const forms = [...new Set(abbreviations(name).map((form) => normaliseWords(form)))];
  return { words: instance.words, expected: { name: normaliseWords(name), forms }, answer };
}

// Whether a name rule fits so many names that it is no short form but a flood.
function generic(places: readonly PlaceDto[], rule: CompiledRule): boolean {
  if (rule.kind !== 'name') {
    return false;
  }
  const fits = places.filter(({ name }) => rule.regex.test(normaliseWords(name))).length;
  return fits > GENERIC_SHARE * places.length;
}

interface Context {
  places: readonly PlaceDto[];
  instances: readonly Instance[];
  // The rules tried so far in the run, by kind, pattern and replacement, so that none is tried twice.
  tried: Map<string, RuleText>;
}

function textOf({ kind, pattern, replace }: RuleText): string {
  return `${kind}\n${pattern}\n${replace}`;
}

// A proposal as a child of the parent: compiled, new, not generic, and better on the minibatch.
async function tryProposal(
  { places, instances, tried }: Context,
  parent: Candidate,
  proposal: Proposal,
  minibatch: readonly number[],
): Promise<{ outcome: string; child: Candidate | null }> {
  const compiled = compileRule(randomUUID(), proposal);
  if ('refusal' in compiled) {
    return { outcome: `refused: ${compiled.refusal}`, child: null };
  }
  if (parent.rules.some((rule) => sameRule(rule, compiled.rule))) {
    return { outcome: 'dropped: already in force', child: null };
  }
  if (tried.has(textOf(compiled.rule))) {
    return { outcome: 'dropped: already tried', child: null };
  }
  tried.set(textOf(compiled.rule), proposal);
  if (generic(places, compiled.rule)) {
    return { outcome: 'refused: fits too many names', child: null };
  }
  const rules = [...parent.rules, compiled.rule];
  const batch = minibatch.map((index) => instances[index]).filter((instance) => instance !== undefined);
  const before = correctCount(minibatch.map((index) => parent.verdicts[index]).filter((v) => v !== undefined));
  const after = correctCount(await verdictsOf(indexOf(places, rules), batch));
  if (after <= before) {
    return { outcome: 'dropped: no gain on the minibatch', child: null };
  }
  return { outcome: 'kept', child: await candidateOf(places, rules, instances) };
}

// The most right candidate; among equals the one with fewer rules, then the earlier.
function bestOf(candidates: readonly Candidate[]): Candidate {
  const [first] = candidates;
  if (first === undefined) {
    throw new Error('No candidate');
  }
  return candidates.reduce((best, candidate) => {
    const gain = correctCount(candidate.verdicts) - correctCount(best.verdicts);
    return gain > 0 || (gain === 0 && candidate.rules.length < best.rules.length) ? candidate : best;
  }, first);
}

export async function evolve({ places, instances, root, reflector, budget, seed }: LoopOptions): Promise<Evolution> {
  const random = seededRandom(seed);
  const names = new Map(places.map(({ id, name }) => [id, name]));
  const candidates = [await candidateOf(places, root, instances)];
  const attempts: Attempt[] = [];
  const context: Context = { places, instances, tried: new Map(root.map((rule) => [textOf(rule), rule])) };
  for (let call = 1; call <= budget; call += 1) {
    const parent = sampleFront(paretoFront(candidates), random);
    const failing = instances.flatMap((_, index) => {
      const verdict = parent.verdicts[index];
      return verdict !== undefined && !verdict.correct ? [index] : [];
    });
    if (failing.length === 0) {
      break;
    }
    const minibatch = sampleSome(failing, MINIBATCH, random);
    const failures = minibatch.flatMap((index) => {
      const instance = instances[index];
      const verdict = parent.verdicts[index];
      return instance === undefined || verdict === undefined ? [] : [failureOf(names, instance, verdict)];
    });
    const inForce = new Set(parent.rules.map((rule) => textOf(rule)));
    const triedBefore = [...context.tried].flatMap(([text, rule]) => (inForce.has(text) ? [] : [rule]));
    // oxlint-disable-next-line no-await-in-loop -- each call builds on the candidates the earlier ones made
    const { proposals, note } = await reflector.propose(failures, parent.rules, triedBefore);
    const outcomes: ProposalOutcome[] = [];
    for (const proposal of proposals) {
      // oxlint-disable-next-line no-await-in-loop -- the same
      const { outcome, child } = await tryProposal(context, parent, proposal, minibatch);
      outcomes.push({ ...proposal, outcome });
      if (child !== null) {
        candidates.push(child);
      }
    }
    attempts.push({
      call,
      parentRules: parent.rules.length,
      minibatch: failures.map(({ words }) => words),
      proposals: outcomes,
      note,
    });
  }
  return { best: bestOf(candidates), candidates: candidates.length, attempts };
}
