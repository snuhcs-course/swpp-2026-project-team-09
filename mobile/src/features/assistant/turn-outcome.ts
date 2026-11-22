/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, AnswerReply, Plan } from '@/api/assistant-types';
import { koreaClock } from '@/korea-time';
import type { LibraryDone } from '@/library/cards/done';
import { modelWordsOf } from './model-words';
import type { EarlierConversation } from './conversations';
import { type Turn, turnsOf } from './turn';
import type { ChatBubble } from './use-chat';

// What became of a reply's Plan on this phone, with the Plan's words (`planWhat`) as it was on screen, a recalculation's
// included: invited to (`sent`, with how many Friends), taken alone ("여기로"), a Quest already set changed to it
// (바꾸기), or that Quest left as it was (그대로 두기). Nothing marks one not made.
export type PlanOutcome =
  { kind: 'sent'; what: string; invited: number } | { kind: 'alone' | 'changed' | 'kept'; what: string };

// What became of each reply's Plan, by the reply's bubble id.
export type PlanOutcomes = ReadonlyMap<number, PlanOutcome>;

const OUTCOME_WORDS: Record<Exclude<PlanOutcome['kind'], 'sent'>, string> = {
  alone: '혼자 가기로 함',
  changed: '바꿈',
  kept: '그대로 둠',
};
const NOT_MADE = '아직 만들지 않음';
const MADE = '만듦';
const BOOKED = '예약함';
const WAITING = '답을 기다리는 중';
const FAILED = '답을 가져오지 못함';
const USED_UP = '오늘은 더 답하지 못함';
const TODAY = '오늘 ';

function joined(what: string, outcome: string): string {
  return `${what} · ${outcome}`;
}

function lineWords(line: AnswerLine | undefined): string {
  return line?.map(({ text }) => text).join('') ?? '';
}

// "학생회관식당 12:33": the Plan's place and when everyone is there.
export function planWhat(plan: Plan): string {
  return `${plan.place.label} ${koreaClock(plan.startAt)}`;
}

function planWords(answer: AnswerReply, outcome: PlanOutcome | undefined): string | null {
  if (outcome !== undefined) {
    // The number alone, never the Friends' names.
    const words = outcome.kind === 'sent' ? `초대 ${String(outcome.invited)}명 보냄` : OUTCOME_WORDS[outcome.kind];
    return joined(outcome.what, words);
  }
  const [plan] = answer.plans;
  return plan === undefined ? lineWords(answer.noPlan?.lines[0]) || null : joined(planWhat(plan), NOT_MADE);
}

// "7233번 · 14:00–16:30 예약함": the seat or room booked and its time, today's without its day.
function bookingWords({ rows }: LibraryDone): string | null {
  const seat = rows.find(({ label }) => label === '좌석' || label === '방')?.value;
  const time = rows.find(({ label }) => label === '시간')?.value;
  if (seat === undefined || time === undefined) {
    return null;
  }
  return joined(seat, `${time.startsWith(TODAY) ? time.slice(TODAY.length) : time} ${BOOKED}`);
}

// The first line the model wrote, without Markdown's marks.
function firstWords(text: string): string {
  return (
    modelWordsOf(text)
      .split('\n')
      .map((line) => line.replaceAll(/[*#`>_]/gu, '').trim())
      .find((line) => line !== '') ?? ''
  );
}

function replyWords(bubble: ChatBubble, outcomes: PlanOutcomes): string | null {
  const { answer, lookup, proposal, madeQuestId, done } = bubble;
  if (done !== undefined) {
    return bookingWords(done);
  }
  if (answer !== undefined && answer !== null) {
    return planWords(answer, outcomes.get(bubble.id));
  }
  if (proposal !== null) {
    return joined(proposal.title, madeQuestId === undefined ? NOT_MADE : MADE);
  }
  const said = firstWords(bubble.text);
  if (said !== '') {
    return said;
  }
  return lookup === undefined || lookup === null ? null : lineWords(lookup.lines[0]) || null;
}

// What a turn came to, in a few words, for the list of questions (P04 ticket 10): "{what} · {outcome}" for a Plan, a
// Proposal, or a booking; the first line of the reply's words otherwise; why there is no reply when there is none.
// The last thing said that has words of its own speaks for the turn: a booking made after the reply's card speaks
// over the reply.
export function turnOutcome(turn: Turn, outcomes: PlanOutcomes, waiting: boolean): string {
  for (const bubble of turn.after.toReversed()) {
    if (bubble.failure !== null) {
      return bubble.failure === 'usedUp' ? USED_UP : FAILED;
    }
    const words = replyWords(bubble, outcomes);
    if (words !== null) {
      return words;
    }
  }
  return waiting ? WAITING : '';
}

// A question of the list (P04 ticket 10): its turn, the conversation it belongs to (null for the current one), what was
// asked, when, and what it came to; `onScreen` for the turn the answer frame shows.
export interface QuestionRow {
  turnId: number;
  conversation: number | null;
  asked: string;
  time: string;
  outcome: string;
  onScreen: boolean;
}

// The turns a question opens: a turn of the app's own bubbles alone asked nothing.
export function questionsOf(bubbles: readonly ChatBubble[]): Turn[] {
  return turnsOf(bubbles).filter((turn) => bubbles.find(({ id }) => id === turn.id)?.role === 'user');
}

interface Listed {
  current: readonly ChatBubble[];
  earlier: readonly EarlierConversation[];
  outcomes: PlanOutcomes;
  // A reply is on its way for the current conversation's last question.
  waiting: boolean;
  // The id of the turn the frame shows, null for none.
  onScreen: number | null;
}

function rowsOf(bubbles: readonly ChatBubble[], conversation: number | null, listed: Listed): QuestionRow[] {
  const questions = questionsOf(bubbles);
  return questions.map((turn): QuestionRow => {
    const at = bubbles.find(({ id }) => id === turn.id)?.at;
    const last = conversation === null && turn === questions.at(-1);
    return {
      turnId: turn.id,
      conversation,
      asked: turn.asked,
      time: at === undefined ? '' : koreaClock(new Date(at).toISOString()),
      outcome: turnOutcome(turn, listed.outcomes, last && listed.waiting),
      onScreen: conversation === null && turn.id === listed.onScreen,
    };
  });
}

// Every question of the conversations kept while the app runs, the latest first: bubble ids grow with time, and a
// turn's id is its question's.
export function questionRows(listed: Listed): QuestionRow[] {
  const rows = [
    ...rowsOf(listed.current, null, listed),
    ...listed.earlier.flatMap(({ id, bubbles }) => rowsOf(bubbles, id, listed)),
  ];
  return rows.toSorted((one, other) => other.turnId - one.turnId);
}
