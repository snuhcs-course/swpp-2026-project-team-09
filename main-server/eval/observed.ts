/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type Action } from './expect.ts';
import { outcomeOf, roleOf } from './normalise.ts';
import { type FailureKind, type TurnTrace } from './trace.ts';

// The observed action of a turn, read without the case's `expect`, for diagnosis only: the scorecard's confusion table
// of what each case accepts against what the model did. It decides no pass; the scorer's action (eval/score.ts) does.
// Without the case's label REFUSE and CHAT cannot be told apart, so a reply with no tool and no question is NO_TOOL;
// one that called tools and took none of the kinds is NONE; a turn that failed is its failure kind.

export type Observed = Exclude<Action, 'REFUSE' | 'CHAT'> | 'NO_TOOL' | 'NONE' | FailureKind;

// How a last sentence asks back: a question mark, or a Korean ending that asks or requests, compared with spaces
// removed. A courtesy question such as "더 궁금한 거 있으세요?" also counts, which only the case's mentions tell apart.
export const ASK_CUES = ['?', '까요', '할래요', '주세요', '어떠세요', '알려 주세요', '실래요', '나요'] as const;

// A sentence ends at ., ! or ? or a line break.
const SENTENCES = /[^.!?\n]+[.!?]*/gu;
const TRAILING = /[\s.!~…]+$/u;

// Whether the text's last sentence asks back.
export function asksBack(text: string): boolean {
  const last = (text.match(SENTENCES) ?? []).map((sentence) => sentence.trim()).findLast((sentence) => sentence !== '');
  if (last === undefined) {
    return false;
  }
  const ending = last.replace(TRAILING, '').replaceAll(/\s/gu, '');
  return ASK_CUES.some((cue) => ending.endsWith(cue.replaceAll(/\s/gu, '')));
}

export function observedActionOf(trace: TurnTrace): Observed {
  const { reply } = trace;
  if (reply === null) {
    return trace.failure ?? 'ERROR';
  }
  const calls = trace.steps.flatMap(({ toolCalls }) => toolCalls);
  const calledFor = calls.some((call) => {
    const outcome = outcomeOf(call);
    return (
      (roleOf(call.name) === 'resolver' && (outcome === 'several' || outcome === 'none')) ||
      (roleOf(call.name) === 'proposer' && outcome === 'refused')
    );
  });
  const asks = asksBack(reply.text);
  if (typeof reply.proposal === 'object' && reply.proposal !== null) {
    return asks ? 'PROPOSE+ASK' : 'PROPOSE';
  }
  const answered = calls.some((call) => roleOf(call.name) === 'lookup' && ['found', 'none'].includes(outcomeOf(call)));
  if (reply.cards.length > 0 || reply.mapButtons.length > 0 || (answered && reply.text.trim() !== '')) {
    return asks || calledFor ? 'TOOL+ASK' : 'TOOL';
  }
  if (asks || calledFor) {
    return 'ASK';
  }
  return calls.length === 0 ? 'NO_TOOL' : 'NONE';
}
