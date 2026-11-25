/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Plan, PlanInput } from '@/api/assistant-types';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { NEW_QUEST_ANSWER } from '@/api/mock/data/new-quest-answer';
import { QUESTS_ANSWER } from '@/api/mock/data/quests-answer';
import { peopleOf, withOrigin } from '@/features/assistant/plan-input';
import { newPartyOf, partiesOf } from '@/features/assistant/row-four-inputs';
import { addNameOf } from '@/screens/main/answer/who-words';

// The conditions the buttons of an events Plan and a party's Plan recalculate with (P02 ticket 30), and the words of
// "＋ 같이" by the kind of the answer. Expected values: the ticket's inputs, and the stored copies' ids: the job fair
// (42b86020…) on Friday 2026-11-20, the 18:00 badminton party on Thursday 2026-11-19, and the asker 유상 (11ca538e…).

const JOB_FAIR = '42b86020-4f3a-42e0-9efb-8a60e66a7d0b';
const ASKER = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const PLACE_63 = 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b';

function first(plans: readonly Plan[]): Plan {
  const [plan] = plans;
  if (plan === undefined) {
    throw new Error('The copy has no Plan');
  }
  return plan;
}

const fair = first(EVENTS_ANSWER.plans);
const party = first(QUESTS_ANSWER.plans);

// The parties of the job fair, as "같이 갈 파티" of an events Plan asks for them.
const FAIR_PARTIES: PlanInput = { kind: 'quests', globalEventId: JOB_FAIR, questIds: null };

describe('the parties of an events Plan', () => {
  it("are those going to the Plan's event, with no ids of a search", () => {
    expect(partiesOf(fair)).toEqual(FAIR_PARTIES);
  });
});

// Partitions: an events Plan; a party's Plan of a Global Event and of a search; a meal's and a new party's Plan.
describe('a new party from a Plan', () => {
  it("is for the events Plan's event on the answer's day, with the asker alone and nothing said", () => {
    expect(newPartyOf(EVENTS_ANSWER.input, fair)).toEqual({
      kind: 'new-quest',
      date: '2026-11-20',
      globalEventId: JOB_FAIR,
      title: null,
      placeId: null,
      time: null,
      people: [{ userId: ASKER, constraints: [] }],
    });
  });

  it("is for the same event on the party's day in Korea, from the parties of an event", () => {
    expect(newPartyOf(FAIR_PARTIES, party)).toEqual({
      kind: 'new-quest',
      date: '2026-11-19',
      globalEventId: JOB_FAIR,
      title: null,
      placeId: null,
      time: null,
      people: [{ userId: ASKER, constraints: [] }],
    });
  });

  it('is none from the parties of a search, whose activity only the Assistant knows', () => {
    expect(newPartyOf(QUESTS_ANSWER.input, party)).toBeNull();
  });

  it("is none from a meal's Plan and from a new party's", () => {
    expect(newPartyOf(MEAL_ANSWER.input, first(MEAL_ANSWER.plans))).toBeNull();
    expect(newPartyOf(NEW_QUEST_ANSWER.input, first(NEW_QUEST_ANSWER.plans))).toBeNull();
  });

  it('is none from a Plan that names no asker among its parts', () => {
    expect(newPartyOf(EVENTS_ANSWER.input, { ...fair, parts: [] })).toBeNull();
  });
});

// Partitions: a new party; a meal, which takes the start.
describe('a start chosen on the map', () => {
  it("leaves a new party's people without constraints, which the main server refuses", () => {
    expect(withOrigin(NEW_QUEST_ANSWER.input, PLACE_63)).toBe(NEW_QUEST_ANSWER.input);
  });

  it("still gives a meal's asker the start", () => {
    expect(peopleOf(withOrigin(MEAL_ANSWER.input, PLACE_63))[0]?.constraints).toEqual([
      { kind: 'from', placeId: PLACE_63, source: 'asker' },
    ]);
  });
});

// Partitions: each kind of the conditions.
describe('the words of "＋ 같이"', () => {
  it('name the chip by what a Friend is added to, and leave it out for events and parties', () => {
    expect(addNameOf('meal')).toBe('같이 먹을 친구 추가');
    expect(addNameOf('meet')).toBe('같이 만날 친구 추가');
    expect(addNameOf('new-quest')).toBe('초대할 친구 추가');
    expect(addNameOf('events')).toBeNull();
    expect(addNameOf('quests')).toBeNull();
  });
});
