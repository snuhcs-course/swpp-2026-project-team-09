/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { READING_ROOM } from '@/api/mock/data/library';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { WAY_LOOKUP_REPLY } from '@/api/mock/data/way-lookup';
import type { Turn } from '@/features/assistant/turn';
import { type PlanOutcomes, questionRows, turnOutcome } from '@/features/assistant/turn-outcome';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { seatsCardOf } from '@/library/cards/made';
import type { LibraryDone } from '@/library/cards/done';
import { LUNCH } from '../support/push-moments';

// What a turn came to, for the list of questions (P04 ticket 10): "{what} · {outcome}" for a Plan, a Proposal, and a
// booking, the reply's first words otherwise, and why there is no reply.

const NONE: PlanOutcomes = new Map();
// MEAL_ANSWER's first Plan: 302동식당, everyone there at 12:15.
const FIRST_PLAN = '302동식당 12:15';

function said(id: number, text: string, at?: number): ChatBubble {
  return { id, role: 'user', text, cards: [], mapButtons: [], proposal: null, failure: null, at };
}

function reply(id: number, more: Partial<ChatBubble> = {}): ChatBubble {
  return { id, role: 'assistant', text: '', cards: [], mapButtons: [], proposal: null, failure: null, ...more };
}

function turn(...after: ChatBubble[]): Turn {
  return { id: 1, asked: '배고파', after };
}

const BOOKED: LibraryDone = {
  title: '7233번 예약되었어요!',
  rows: [
    { label: '장소', value: '관정관 (62동) 7층 노트북존' },
    { label: '좌석', value: '7233번' },
    { label: '시간', value: '오늘 14:00–16:30' },
    { label: '예약 번호', value: '123' },
  ],
  seat: true,
  seatsCard: seatsCardOf(READING_ROOM, []),
};

// Partitions: a Plan sent, taken alone, changed, kept, not made; an answer without a Plan.
describe('the outcome of a Plan', () => {
  it('names the Plan and how many Friends were invited, never who', () => {
    const outcomes: PlanOutcomes = new Map([[2, { kind: 'sent', what: '학생회관식당 12:33', invited: 2 }]]);

    expect(turnOutcome(turn(reply(2, { answer: MEAL_ANSWER })), outcomes, false)).toBe(
      '학생회관식당 12:33 · 초대 2명 보냄',
    );
  });

  it('says a Plan taken alone, a Quest changed to it, and one left as it was', () => {
    const at = (kind: 'alone' | 'changed' | 'kept'): string =>
      turnOutcome(turn(reply(2, { answer: MEAL_ANSWER })), new Map([[2, { kind, what: FIRST_PLAN }]]), false);

    expect([at('alone'), at('changed'), at('kept')]).toEqual([
      `${FIRST_PLAN} · 혼자 가기로 함`,
      `${FIRST_PLAN} · 바꿈`,
      `${FIRST_PLAN} · 그대로 둠`,
    ]);
  });

  it('names the first Plan as not made while nothing became of it', () => {
    expect(turnOutcome(turn(reply(2, { answer: MEAL_ANSWER })), NONE, false)).toBe(`${FIRST_PLAN} · 아직 만들지 않음`);
  });

  it("gives an answer without a Plan its first line's words", () => {
    const noPlan = { reason: 'no-fit' as const, lines: [[{ text: '오늘은 모두 맞는 곳이 없어요', strong: false }]] };
    const answer = { ...MEAL_ANSWER, plans: [], noPlan: noPlan as NonNullable<typeof MEAL_ANSWER.noPlan> };

    expect(turnOutcome(turn(reply(2, { answer })), NONE, false)).toBe('오늘은 모두 맞는 곳이 없어요');
  });
});

// Partitions: a booking today and on another day; a Proposal made and not; words; a Lookup without words; a failure;
// a reply on its way; nothing.
describe('the outcome of a turn without a Plan', () => {
  it("names a booking's seat and its time, today's without its day", () => {
    const later = {
      ...BOOKED,
      rows: BOOKED.rows.map((row) => (row.label === '시간' ? { ...row, value: '내일 09:00–10:00' } : row)),
    };

    expect(turnOutcome(turn(reply(2), reply(3, { own: true, done: BOOKED })), NONE, false)).toBe(
      '7233번 · 14:00–16:30 예약함',
    );
    expect(turnOutcome(turn(reply(3, { own: true, done: later })), NONE, false)).toBe(
      '7233번 · 내일 09:00–10:00 예약함',
    );
  });

  it('says whether a Proposal was made', () => {
    expect(turnOutcome(turn(reply(2, { proposal: LUNCH })), NONE, false)).toBe('학식 같이 먹어요 · 아직 만들지 않음');
    expect(turnOutcome(turn(reply(2, { proposal: LUNCH, madeQuestId: 'q1' })), NONE, false)).toBe(
      '학식 같이 먹어요 · 만듦',
    );
  });

  it("gives words their first line without Markdown's marks", () => {
    expect(
      turnOutcome(turn(reply(2, { text: '\n**정문 셔틀**이 먼저 와요.\n자연대 셔틀은 10분 뒤' })), NONE, false),
    ).toBe('정문 셔틀이 먼저 와요.');
  });

  it("gives a Lookup without the model's words its first line", () => {
    const lookup = { ...WAY_LOOKUP_REPLY.lookup, lines: [[{ text: '301동까지 걸어서 12분', strong: false }]] };

    expect(turnOutcome(turn(reply(2, { text: '아래에서 확인해 보세요.', lookup })), NONE, false)).toBe(
      '301동까지 걸어서 12분',
    );
  });

  it('says why there is no reply: a failure, the day used up, a reply on its way', () => {
    expect(turnOutcome(turn(reply(2, { failure: 'unavailable', text: '답을 가져오지 못했어요.' })), NONE, false)).toBe(
      '답을 가져오지 못함',
    );
    expect(turnOutcome(turn(reply(2, { failure: 'usedUp' })), NONE, false)).toBe('오늘은 더 답하지 못함');
    expect(turnOutcome(turn(), NONE, true)).toBe('답을 기다리는 중');
    expect(turnOutcome(turn(), NONE, false)).toBe('');
  });
});

// Partitions: the current conversation and an earlier one; the turn on screen; a turn of the app's own bubbles alone.
describe('the rows of the list of questions', () => {
  // 12:00 and 12:05 in Korea.
  const NOON = Date.parse('2026-11-17T03:00:00Z');
  const LATER = NOON + 5 * 60_000;

  it('holds every question of every conversation, the latest first, the turn on screen marked', () => {
    const earlier = [said(1, '셔틀 어디 있어?', NOON), reply(2, { text: '정문에 있어요.' })];
    const current = [said(3, '배고파', LATER), reply(4, { answer: MEAL_ANSWER })];

    const rows = questionRows({
      current,
      earlier: [{ id: 1, bubbles: earlier }],
      outcomes: NONE,
      waiting: false,
      onScreen: 3,
    });

    expect(rows).toEqual([
      {
        turnId: 3,
        conversation: null,
        asked: '배고파',
        time: '12:05',
        outcome: `${FIRST_PLAN} · 아직 만들지 않음`,
        onScreen: true,
      },
      {
        turnId: 1,
        conversation: 1,
        asked: '셔틀 어디 있어?',
        time: '12:00',
        outcome: '정문에 있어요.',
        onScreen: false,
      },
    ]);
  });

  it("leaves out the app's own bubbles that answer no question, and says the last question waits", () => {
    const current = [reply(1, { own: true, text: '예약 창이 열렸어요' }), said(2, '배고파', NOON)];

    const rows = questionRows({ current, earlier: [], outcomes: NONE, waiting: true, onScreen: null });

    expect(rows.map(({ asked, outcome }) => [asked, outcome])).toEqual([['배고파', '답을 기다리는 중']]);
  });
});
