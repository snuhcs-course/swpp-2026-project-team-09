/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';
import { LEAVE_LOOKUP_REPLY } from '@/api/mock/data/way-lookups';
import {
  chosenOnReply,
  lookupTakesTheMap,
  mayChooseStep,
  stepIdOf,
  stepPartsOf,
  stepShowsCard,
} from '@/features/assistant/step-choice';
import type { ChatBubble } from '@/features/assistant/use-chat';

// Which step of several is chosen (P03 ticket 21), by the rules the user decided on 2026-11-28: on the first reply the
// step due first, or the step of a plan chosen in words; on a later one the first step whose answer the reply drew, else
// the step chosen before while it is there, else the step due first; and no change while Friends are being picked.

const NOW = new Date('2026-11-28T09:00:00+09:00');

const stepOf = (key: string, start: string, end: string): ReplyStep => ({
  kind: 'meal',
  title: key,
  place: null,
  from: null,
  startAt: `2026-11-28T${start}:00+09:00`,
  endAt: `2026-11-28T${end}:00+09:00`,
  status: 'shown',
  reason: null,
  shows: { kind: 'answer', key },
});

const SEAT: ReplyStep = {
  ...stepOf('', '07:00', '08:00'),
  kind: 'seat',
  title: '7층',
  shows: { kind: 'card', key: 'book' },
};
const LUNCH = stepOf('lunch', '12:00', '13:00');
const DINNER = stepOf('dinner', '18:00', '19:00');
const STEPS = [SEAT, LUNCH, DINNER];

const answer = (key: string): AnswerReply => ({ ...MEAL_ANSWER, key });

// Partitions: first reply with and without `select.key`; later reply that drew an answer, that drew none with the step
// before still there or gone; picking open or not.
describe('The step chosen as a reply arrives', () => {
  it('is the step due first on the first reply, the seat over by 09:00 left behind', () => {
    expect(chosenOnReply(STEPS, {}, null, NOW)).toBe(1);
  });

  it('is the step of a plan chosen in words, on the first reply or a later one', () => {
    expect(chosenOnReply(STEPS, { selectKey: 'dinner' }, null, NOW)).toBe(2);
    expect(chosenOnReply(STEPS, { selectKey: 'dinner', answers: [answer('lunch')] }, stepIdOf(LUNCH), NOW)).toBe(2);
  });

  it('is on a later reply the first step in their order whose answer the reply drew', () => {
    expect(chosenOnReply(STEPS, { answers: [answer('dinner')] }, stepIdOf(LUNCH), NOW)).toBe(2);
  });

  it('is on a later reply that drew none the step chosen before, else the step due first', () => {
    expect(chosenOnReply(STEPS, { answers: [] }, stepIdOf(DINNER), NOW)).toBe(2);
    expect(chosenOnReply([SEAT, LUNCH], { answers: [] }, stepIdOf(DINNER), NOW)).toBe(1);
  });
});

describe('A step chosen by a press', () => {
  it('is refused while Friends are being picked', () => {
    expect(mayChooseStep({ adding: true })).toBe(false);
    expect(mayChooseStep({ adding: false })).toBe(true);
  });
});

// The reply of a seat and dinner ("17시 반에 관정 갔다가 19시쯤 저녁 먹을래") as a bubble, its steps on the map or not.
const REPLY = stepsReplyOn('2026-11-02');
const LIBRARY = REPLY.cards.flatMap((card) => (card.kind === 'library' ? [card] : []));
const BUBBLE: ChatBubble = {
  id: 7,
  role: 'assistant',
  text: REPLY.text,
  cards: LIBRARY,
  mapButtons: [],
  proposal: null,
  failure: null,
  answer: REPLY.answer,
  steps: REPLY.steps,
};
const ON_MAP = { bubbleId: 7, steps: REPLY.steps ?? [] };

// Partitions: the seat's step chosen, the meal's, a step refused, the steps of another reply on the map.
describe('What of a reply of several requests the card shows (P03 ticket 23)', () => {
  it("is, for the seat's step, the reply's sentence and the seat's ticket, without the meal's answer", () => {
    const part = stepPartsOf(BUBBLE, ON_MAP, 0);
    expect(part.answer).toBeNull();
    expect(part.text).toBe(REPLY.text);
    expect(part.cards).toEqual(LIBRARY);
  });

  it("is, for the meal's step, its answer and no ticket", () => {
    const part = stepPartsOf(BUBBLE, ON_MAP, 1);
    expect(part.answer).toBe(REPLY.answer);
    expect(part.cards).toEqual([]);
  });

  it("is the reply as it is for a step refused, or when another reply's steps are on the map", () => {
    const refused = { ...ON_MAP, steps: ON_MAP.steps.map((step, at) => (at === 0 ? { ...step, shows: null } : step)) };
    expect(stepPartsOf(BUBBLE, refused, 0)).toBe(BUBBLE);
    expect(stepPartsOf(BUBBLE, { ...ON_MAP, bubbleId: 8 }, 0)).toBe(BUBBLE);
  });
});

// Rule 7. Partitions: a Lookup with steps that name their answers by key; with steps that name none, as a main server
// before `answers` can send a booking's steps beside a Lookup (TaeHyun79's review of #729); no Lookup.
describe('A Lookup the steps came with', () => {
  const { lookup } = LEAVE_LOOKUP_REPLY;

  it('takes the map when the steps name their answers by key', () => {
    expect(lookupTakesTheMap({ lookup, steps: STEPS })).toBe(true);
  });

  it('leaves the map to the steps of a main server before answers, and to a reply with no Lookup', () => {
    expect(
      lookupTakesTheMap({ lookup, steps: [SEAT, { ...SEAT, title: '스터디룸', kind: 'room', shows: null }] }),
    ).toBe(false);
    expect(lookupTakesTheMap({ lookup: null, steps: STEPS })).toBe(false);
  });
});

// A booking on the map stands as it does alone (its band on the bar, its card the ticket) with no steps, or with its own
// card's step chosen. Partitions: no steps; the seat's step chosen; another step chosen; a room's step, whose booking the
// map does not draw, so its card keeps its band as a room card alone does.
describe('A booking on the map among steps', () => {
  const seatKey = SEAT.shows?.kind === 'card' ? SEAT.shows.key : '';
  const steps = { bubbleId: 1, steps: STEPS };

  it('stands as alone with no steps, and with its own step chosen', () => {
    expect(stepShowsCard(null, 0, seatKey)).toBe(true);
    expect(stepShowsCard(steps, 0, seatKey)).toBe(true);
  });

  it("does not while another step is chosen, nor for another card's step", () => {
    expect(stepShowsCard(steps, 1, seatKey)).toBe(false);
    expect(stepShowsCard(steps, 0, 'room-1')).toBe(false);
  });
});
