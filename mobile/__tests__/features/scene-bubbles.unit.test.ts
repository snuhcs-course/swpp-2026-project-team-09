/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MENU_LOOKUP } from '@/api/mock/data/menu-lookup';
import { sceneBubblesOf } from '@/features/assistant/scene-bubbles';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { SEAT_CARD } from '../support/library-chat';

// The bubbles the map's scene is drawn from (P04 ticket 46): a follow-up answered with words alone, or still on its
// way, keeps the answer before it on the map. Expected values: the conversations written here, by their ids.
function bubble(id: number, role: 'user' | 'assistant', extra: Partial<ChatBubble> = {}): ChatBubble {
  return {
    id,
    role,
    text: `${role} ${String(id)}`,
    cards: [],
    mapButtons: [],
    proposal: null,
    failure: null,
    ...extra,
  };
}

const ANSWER = MEAL_ANSWER;
const LIBRARY = [SEAT_CARD];
const FACT = { ...MENU_LOOKUP, fact: true as const };

const ids = (bubbles: readonly ChatBubble[]): number[] => bubbles.map(({ id }) => id);

// Partitions: a single answer; a words-only follow-up after a seat card; one after a meal's answer; a follow-up still
// on its way.
describe('sceneBubblesOf', () => {
  it('keeps every bubble when the latest turn draws its own scene', () => {
    const talk = [bubble(1, 'user'), bubble(2, 'assistant', { answer: ANSWER })];

    expect(ids(sceneBubblesOf(talk))).toEqual([1, 2]);
  });

  it("keeps a seat card's turn under a follow-up answered with words alone", () => {
    const talk = [
      bubble(1, 'user'),
      bubble(2, 'assistant', { cards: LIBRARY }),
      bubble(3, 'user'),
      bubble(4, 'assistant', { refusal: null }),
    ];

    expect(ids(sceneBubblesOf(talk))).toEqual([1, 2]);
  });

  it("keeps a meal's answer under a follow-up still on its way", () => {
    const talk = [bubble(1, 'user'), bubble(2, 'assistant', { answer: ANSWER }), bubble(3, 'user')];

    expect(ids(sceneBubblesOf(talk))).toEqual([1, 2]);
  });
});

// Partitions: two words-only follow-ups; a follow-up with its own card; words only throughout.
describe('sceneBubblesOf over several turns', () => {
  it('looks back over several words-only follow-ups', () => {
    const talk = [
      bubble(1, 'user'),
      bubble(2, 'assistant', { answer: ANSWER }),
      bubble(3, 'user'),
      bubble(4, 'assistant'),
      bubble(5, 'user'),
      bubble(6, 'assistant'),
    ];

    expect(ids(sceneBubblesOf(talk))).toEqual([1, 2]);
  });

  it('lets a follow-up with its own card replace the scene', () => {
    const talk = [
      bubble(1, 'user'),
      bubble(2, 'assistant', { answer: ANSWER }),
      bubble(3, 'user'),
      bubble(4, 'assistant', { cards: LIBRARY }),
    ];

    expect(ids(sceneBubblesOf(talk))).toEqual([1, 2, 3, 4]);
  });

  it('keeps every bubble when no turn draws a scene', () => {
    const talk = [bubble(1, 'user'), bubble(2, 'assistant'), bubble(3, 'user'), bubble(4, 'assistant')];

    expect(ids(sceneBubblesOf(talk))).toEqual([1, 2, 3, 4]);
  });
});

// P04 ticket 58. Partitions: a fact Lookup under words alone; under a reply still on its way; a Lookup that is not a
// fact under words alone.
describe('sceneBubblesOf after a fact', () => {
  it('lets a fact go once a follow-up is answered with words alone', () => {
    const talk = [
      bubble(1, 'user'),
      bubble(2, 'assistant', { lookup: FACT }),
      bubble(3, 'user'),
      bubble(4, 'assistant'),
    ];

    expect(ids(sceneBubblesOf(talk))).toEqual([1, 2, 3, 4]);
  });

  it('keeps a fact while the follow-up is on its way', () => {
    const talk = [bubble(1, 'user'), bubble(2, 'assistant', { lookup: FACT }), bubble(3, 'user')];

    expect(ids(sceneBubblesOf(talk))).toEqual([1, 2]);
  });

  it('keeps a Lookup that is not a fact under words alone', () => {
    const talk = [
      bubble(1, 'user'),
      bubble(2, 'assistant', { lookup: MENU_LOOKUP }),
      bubble(3, 'user'),
      bubble(4, 'assistant'),
    ];

    expect(ids(sceneBubblesOf(talk))).toEqual([1, 2]);
  });
});
