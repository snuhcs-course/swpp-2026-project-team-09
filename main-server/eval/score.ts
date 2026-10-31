/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type Action, type Expect, expectSchema, type Mention } from './expect.ts';
import {
  argsMatch,
  callKey,
  cardsOf,
  type Names,
  normaliseArgs,
  outcomeOf,
  proposalMismatches,
  proposalOf,
  roleOf,
} from './normalise.ts';
import type { CaseRun } from './runner.ts';
import { type Observed, observedActionOf } from './observed.ts';
import { type FailureKind, type TurnTrace } from './trace.ts';

// The scorer (spec P19, "Scoring (rules only)"): fixed rules that read a turn's trace and reply against its case's
// `expect`. No model grades anything, so a saved run is scored again for free. eval/run-score.ts sums a run's cases
// into the scorecard's numbers.

// One check of a turn and why it failed.
export interface Check {
  name:
    | 'action'
    | 'tools.required'
    | 'tools.forbidden'
    | 'args'
    | 'proposal'
    | 'cards'
    | 'mapButtons'
    | 'text.mentions'
    | 'text.absent';
  passed: boolean;
  detail: string;
}

export interface TurnScore {
  // The action the turn took, or null when it failed or took none of the kinds, such as calling a resolver and
  // answering nothing.
  action: Action | null;
  accepted: Action[];
  // The action is accepted and, when it asks, the text holds the case's mentions: an ASK read from the trace alone
  // is still an ASK, but not a right one.
  recalled: boolean;
  // The action read without the case's expect, for the confusion table only (eval/observed.ts).
  observed: Observed;
  failure: FailureKind | null;
  checks: Check[];
  passed: boolean;
  // One entry per call too many: "<tool>" for a call outside required ∪ allowed or forbidden, "<tool> (repeated)"
  // for a call repeating an earlier one with the same arguments.
  overCalls: string[];
  // Required tools not called.
  underCalls: string[];
  args: { expected: number; matched: number };
}

// Spaces do not count: Korean writes 몇 명 and 몇명 alike.
function compact(text: string): string {
  return text.replaceAll(/\s/gu, '');
}

function mentionedIn(text: string, mention: Mention): boolean {
  const words = typeof mention === 'string' ? [mention] : mention;
  return words.some((word) => compact(text).includes(compact(word)));
}

function missingMentions(text: string, expect: Expect): Mention[] {
  return (expect.text?.mentions ?? []).filter((mention) => !mentionedIn(text, mention));
}

// The action of a turn that ended with a reply (the spec's "Scoring"):
// - PROPOSE: the reply carries a Proposal.
// - TOOL: the reply shows cards or map buttons; or a lookup found data and the text answers in words, a missing
//   button or card failing its own check; or a lookup answered none and the text says so: the case gives mentions
//   and the text holds them.
// - ASK: no Proposal and nothing shown, and the trace calls for a question (a resolver answered several or none,
//   proposeQuest refused, a tool answered needs) or, in a case that accepts an ASK, the text holds its mentions. A
//   question mark never counts.
//   An ASK read from the trace alone is still ASK, so that a wrong one shows, but is recalled only with the mentions.
// - TOOL+ASK and PROPOSE+ASK: TOOL or PROPOSE, in a case that accepts an ASK, with the text holding its mentions.
// - REFUSE or CHAT: no tool called, by what the case accepts: REFUSE when it accepts one, else CHAT.
export function actionOf(trace: TurnTrace, expect: Expect, names: Names): Action | null {
  const { reply } = trace;
  if (reply === null) {
    return null;
  }
  const calls = trace.steps.flatMap(({ toolCalls }) => toolCalls);
  const asksAccepted = expect.actions.some((action) => action.includes('ASK'));
  const holdsMentions = expect.text?.mentions !== undefined && missingMentions(reply.text, expect).length === 0;
  const asks = asksAccepted && holdsMentions;
  if (proposalOf(reply.proposal, names) !== null) {
    return asks ? 'PROPOSE+ASK' : 'PROPOSE';
  }
  const shown = reply.cards.length > 0 || reply.mapButtons.length > 0;
  const answered = (outcome: string): boolean =>
    calls.some((call) => roleOf(call.name) === 'lookup' && outcomeOf(call) === outcome);
  const inWords = answered('found') && reply.text.trim() !== '';
  // A lookup such as getMyDay can be what it took to ask: with nothing shown, a case that accepts an ASK reads one.
  if (!shown && asks && expect.actions.includes('ASK')) {
    return 'ASK';
  }
  if (shown || inWords || (answered('none') && holdsMentions)) {
    return asks ? 'TOOL+ASK' : 'TOOL';
  }
  const calledFor = calls.some((call) => {
    const outcome = outcomeOf(call);
    return (
      outcome === 'needs' ||
      (roleOf(call.name) === 'resolver' && (outcome === 'several' || outcome === 'none')) ||
      (roleOf(call.name) === 'proposer' && outcome === 'refused')
    );
  });
  if (calledFor || asks) {
    return 'ASK';
  }
  if (calls.length === 0) {
    return expect.actions.includes('REFUSE') ? 'REFUSE' : 'CHAT';
  }
  return null;
}

function check(name: Check['name'], failures: string[]): Check {
  return { name, passed: failures.length === 0, detail: failures.join('; ') };
}

interface ToolsScore {
  checks: Check[];
  overCalls: string[];
  underCalls: string[];
  args: { expected: number; matched: number };
}

interface Called {
  name: string;
  args: Record<string, unknown>;
}

// The expected arguments of each tool, each needing a call that holds them.
function argsChecked(
  calls: readonly Called[],
  expect: Expect,
  names: Names,
): Pick<ToolsScore, 'args'> & { failures: string[] } {
  const failures: string[] = [];
  let expected = 0;
  for (const [tool, written] of Object.entries(expect.args)) {
    for (const wanted of Array.isArray(written) ? written : [written]) {
      expected += 1;
      if (!calls.some(({ name, args }) => name === tool && argsMatch(tool, wanted, args, names))) {
        failures.push(`no ${tool} call with ${JSON.stringify(wanted)}`);
      }
    }
  }
  return { args: { expected, matched: expected - failures.length }, failures };
}

// One entry per call too many, in the order called: a call to a tool outside required ∪ allowed or forbidden, else a
// call repeating an earlier one with the same arguments, after normalising.
function overCallsOf(calls: readonly Called[], outside: (name: string) => boolean): string[] {
  const keys = calls.map(({ name, args }) => callKey(name, args));
  return calls.flatMap(({ name }, index) => {
    if (outside(name)) {
      return [name];
    }
    return keys.indexOf(keys[index] ?? '') === index ? [] : [`${name} (repeated)`];
  });
}

function scoreTools(trace: TurnTrace, expect: Expect, names: Names): ToolsScore {
  const calls = trace.steps
    .flatMap(({ toolCalls }) => toolCalls)
    .map(({ name, input }) => ({ name, args: normaliseArgs(name, input, names) }));
  const { required, allowed, forbidden } = expect.tools;
  const called = [...new Set(calls.map(({ name }) => name))];
  const isForbidden = (name: string): boolean => forbidden === '*' || forbidden.includes(name);
  const underCalls = required.filter((name) => !called.includes(name));
  const outside = (name: string): boolean => isForbidden(name) || !(required.includes(name) || allowed.includes(name));
  const { args, failures } = argsChecked(calls, expect, names);
  return {
    checks: [
      check(
        'tools.required',
        underCalls.map((name) => `${name} not called`),
      ),
      check(
        'tools.forbidden',
        called.filter((name) => isForbidden(name)).map((name) => `${name} called`),
      ),
      check('args', failures),
    ],
    overCalls: overCallsOf(calls, outside),
    underCalls,
    args,
  };
}

function outcomeChecks(trace: TurnTrace, expect: Expect, names: Names): Check[] {
  const reply = trace.reply ?? { text: '', cards: [], mapButtons: [], proposal: null };
  const checks: Check[] = [];
  if (expect.proposal !== undefined) {
    const wrong = proposalMismatches(expect.proposal, proposalOf(reply.proposal, names));
    checks.push(check('proposal', wrong.length === 0 ? [] : [`wrong or missing: ${wrong.join(', ')}`]));
  }
  if (expect.cards !== undefined) {
    const seen = cardsOf(reply.cards, names);
    const failures = expect.cards.flatMap(({ kind, seeds, min, max }) => {
      const ofKind = seen.filter((card) => card.kind === kind);
      return [
        ...seeds.filter((seed) => !ofKind.some(({ name }) => name === seed)).map((seed) => `${kind} ${seed} not shown`),
        ...(min !== undefined && ofKind.length < min ? [`${ofKind.length} ${kind} cards, fewer than ${min}`] : []),
        ...(max !== undefined && ofKind.length > max ? [`${ofKind.length} ${kind} cards, more than ${max}`] : []),
      ];
    });
    checks.push(check('cards', failures));
  }
  if (expect.mapButtons !== undefined) {
    const wanted = expect.mapButtons.toSorted();
    const shown = [...reply.mapButtons].toSorted();
    checks.push(
      check('mapButtons', JSON.stringify(wanted) === JSON.stringify(shown) ? [] : [`shown [${shown.join(', ')}]`]),
    );
  }
  if (expect.text?.mentions !== undefined) {
    const missing = missingMentions(reply.text, expect);
    checks.push(
      check(
        'text.mentions',
        missing.map((mention) => `missing ${JSON.stringify(mention)}`),
      ),
    );
  }
  if (expect.text?.absent !== undefined) {
    const held = expect.text.absent.filter((word) => mentionedIn(reply.text, word));
    checks.push(
      check(
        'text.absent',
        held.map((word) => `holds ${JSON.stringify(word)}`),
      ),
    );
  }
  return checks;
}

// Whether the action is accepted and, when it asks, the text holds the mentions.
function recalledOf(action: Action | null, trace: TurnTrace, expect: Expect): boolean {
  if (action === null || !expect.actions.includes(action)) {
    return false;
  }
  return !action.includes('ASK') || missingMentions(trace.reply?.text ?? '', expect).length === 0;
}

// A turn passes when its action is one the case accepts, asking with the mentions, and every other check passes.
export function scoreTurn(trace: TurnTrace, expect: Expect, names: Names): TurnScore {
  const action = actionOf(trace, expect, names);
  const recalled = recalledOf(action, trace, expect);
  const tools = scoreTools(trace, expect, names);
  const actionCheck = check(
    'action',
    recalled ? [] : [trace.failure ?? `took ${action ?? 'none'}, expected ${expect.actions.join(' or ')}`],
  );
  const checks = [actionCheck, ...tools.checks, ...outcomeChecks(trace, expect, names)];
  return {
    action,
    accepted: expect.actions,
    recalled,
    observed: observedActionOf(trace),
    failure: trace.failure,
    checks,
    passed: checks.every(({ passed }) => passed),
    overCalls: tools.overCalls,
    underCalls: tools.underCalls,
    args: tools.args,
  };
}

// A scored turn of a case: its trace and score, or neither when a live case stopped before it.
export interface ScoredTurn {
  index: number;
  trace: TurnTrace | null;
  score: TurnScore | null;
}

export interface CaseScore {
  run: CaseRun;
  passed: boolean;
  turns: ScoredTurn[];
}

function parsedExpect(written: unknown): Expect | null {
  return written === null || written === undefined ? null : expectSchema.parse(written);
}

// A case passes when all its scored turns ran and passed. The last turn is scored by the case's expect, unless a live
// case gives the turn its own; a live case's other turns are scored when they give one.
export function scoreCase(run: CaseRun, names: Names): CaseScore {
  const last = run.turnExpects.length - 1;
  const turns = run.turnExpects.flatMap((written, index): ScoredTurn[] => {
    const expect = parsedExpect(written ?? (index === last ? run.expect : null));
    if (expect === null) {
      return [];
    }
    // A single or fixed-history case has one trace, of its last turn.
    const trace = (run.kind === 'live' ? run.turns[index] : index === last ? run.turns[0] : undefined) ?? null;
    return [{ index, trace, score: trace === null ? null : scoreTurn(trace, expect, names) }];
  });
  return { run, passed: turns.length > 0 && turns.every(({ score }) => score?.passed === true), turns };
}
