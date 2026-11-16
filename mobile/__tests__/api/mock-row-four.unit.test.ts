/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ChatMessage, PlanInput, RequestContext } from '@/api/assistant-types';
import { mockAssistantReply, mockRecalculation } from '@/api/mock/assistant';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { NEW_QUEST_ANSWER } from '@/api/mock/data/new-quest-answer';
import { QUESTS_ANSWER } from '@/api/mock/data/quests-answer';

// The mock's events and recruiting parties answered on the map (P02 ticket 30): the words of boards Alone 1, Join 1,
// and Recruit 4 with a context, and the recalculations of the three kinds, each with the stored copy of the main
// server's real answer. Expected values: the ticket's words and the stored copies.

const CONTEXT: RequestContext = {
  location: { latitude: 37.45016, longitude: 126.95259 },
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

const said = (text: string): ChatMessage[] => [{ role: 'user', text }];

// Partitions: each of the three words with a context; the events words without one.
describe('the mock of the words of row 4', () => {
  it('answers "오늘 볼 만한 거 있어?" with the answer of events', () => {
    expect(mockAssistantReply(said('오늘 볼 만한 거 있어?'), CONTEXT).answer).toEqual(EVENTS_ANSWER);
  });

  it('answers "배드민턴 칠 사람" with the answer of recruiting parties', () => {
    expect(mockAssistantReply(said('배드민턴 칠 사람'), CONTEXT).answer).toEqual(QUESTS_ANSWER);
  });

  it('answers "새로 모집" with the answer of a new party', () => {
    expect(mockAssistantReply(said('새로 모집'), CONTEXT).answer).toEqual(NEW_QUEST_ANSWER);
  });

  it('draws nothing for the same words without a context, as for every answer drawn on the map', () => {
    expect(mockAssistantReply(said('오늘 볼 만한 거 있어?')).answer).toBeUndefined();
  });
});

// Partitions: each of the three kinds, with the input of another copy; a meal still the meal's copy.
describe('the mock of a recalculation of row 4', () => {
  it('answers events, parties, and a new party with their copies, each holding the input it was given', () => {
    const events: PlanInput = { kind: 'events', date: '2026-11-20', eventIds: null };
    const parties: PlanInput = { kind: 'quests', globalEventId: 'e1', questIds: null };
    // The copy's party with the asker alone, as after 서준's ✕.
    const party: PlanInput = {
      kind: 'new-quest',
      date: '2026-11-19',
      globalEventId: null,
      title: '배드민턴',
      placeId: '884c088c-205c-55d7-9860-63c8e28fb3bf',
      time: null,
      people: [{ userId: '11ca538e-e4ef-48d9-9a1f-b7160c553bee', constraints: [] }],
    };

    expect(mockRecalculation(events)).toEqual({ ...EVENTS_ANSWER, input: events });
    expect(mockRecalculation(parties)).toEqual({ ...QUESTS_ANSWER, input: parties });
    expect(mockRecalculation(party)).toEqual({ ...NEW_QUEST_ANSWER, input: party });
  });

  it("answers a meal of the User alone with the meal's copy, as before", () => {
    expect(mockRecalculation(MEAL_ANSWER_ALONE.input)).toEqual(MEAL_ANSWER_ALONE);
  });
});
