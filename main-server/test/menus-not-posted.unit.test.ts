/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { NOT_POSTED } from '../src/assistant/gathering/not-posted.js';
import { planMeal } from '../src/assistant/gathering/plan-tools.js';
import { stateOf } from '../src/assistant/lookup/hours-lookup.js';
import { hoursWords, type MealOfDay } from '../src/assistant/lookup/hours-words.js';
import { MenuLineKind } from '../src/generated/prisma/client.js';

// A day whose menus are not posted yet is not a closed day (P05 ticket 38): planMeal tells the model so, and the map's
// label of an hours answer says the usual hours. Asked on Monday 2026-11-23; menus are posted through Sunday 11-29.

const MONDAY = '2026-11-23';
const NEXT_MONDAY = '2026-11-30';
const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const at = (date: string, clock: string): Date => new Date(`${date}T${clock}:00+09:00`);

// planMeal over a service that answers no plan, from a day posted or not.
function plannedWith(posted: boolean): ReturnType<typeof planMeal> {
  return planMeal({
    restaurantPlaceId: () => null,
    planned: (_askerId, input: MealInput) => {
      const answer: AnswerReply = {
        input,
        chips: [],
        plans: [],
        dropped: [],
        noPlan: { reason: 'no-menu', lines: [] },
      };
      return Promise.resolve({ answer, served: new Map(), posted });
    },
  });
}

function contextAt(now: Date): ToolContext {
  return {
    userId: ME,
    now,
    context: { ...NO_CONTEXT },
    capabilities: new Set<ClientCapability>(['library', 'answer']),
    found: new FoundIds(),
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
}

describe('planMeal for a day with no menu', () => {
  it('tells the model the menus are not posted yet when that day has none at all', async () => {
    const result = await plannedWith(false).run({ date: NEXT_MONDAY, meal: 'lunch' }, contextAt(at(MONDAY, '12:00')));

    expect(result).toEqual({ result: 'none', meal: 'lunch', reason: NOT_POSTED });
  });

  it('tells it that no Restaurant serves the meal when the posted menus hold only notes', async () => {
    const result = await plannedWith(true).run({ date: NEXT_MONDAY, meal: 'lunch' }, contextAt(at(MONDAY, '12:00')));

    expect(result).toEqual({
      result: 'none',
      meal: 'lunch',
      reason: 'No Restaurant serves that meal that day: every menu collected for it holds only notes.',
    });
  });
});

const LUNCH = { opensAt: '11:00', closesAt: '14:30' };
const DINNER = { opensAt: '17:00', closesAt: '19:00' };
const notPosted = (): MealOfDay[] => [
  { meal: 'lunch', lines: [], hours: LUNCH },
  { meal: 'dinner', lines: [], hours: DINNER },
];

const stateAt = (date: string, now: Date, meals: MealOfDay[]): string => {
  const found = hoursWords('학생회관식당', date, now, meals);
  if (found.result !== 'found') {
    throw new Error('No hours');
  }
  return stateOf(found, now);
};

describe("The map's label of an hours answer on a day not posted", () => {
  it('says the usual hours on another day, never that it is closed', () => {
    expect(stateAt(NEXT_MONDAY, at(MONDAY, '12:00'), notPosted())).toBe('평소 점심 11:00–14:30 · 저녁 17:00–19:00');
  });

  it('says today that the menu is not posted yet, with the usual hours', () => {
    expect(stateAt(MONDAY, at(MONDAY, '03:00'), notPosted())).toBe(
      '메뉴 아직 안 올라옴 · 평소 점심 11:00–14:30 · 저녁 17:00–19:00',
    );
  });

  it('says closed only when the menus say so', () => {
    const closed: MealOfDay[] = [
      { meal: 'lunch', lines: [{ text: '※ 휴무', kind: MenuLineKind.note, name: null, price: null }], hours: LUNCH },
    ];

    expect(stateAt(MONDAY, at(MONDAY, '12:00'), closed)).toBe('지금 닫음 · 오늘은 쉬어요');
    expect(stateAt(NEXT_MONDAY, at(MONDAY, '12:00'), closed)).toBe('그날은 쉬어요');
  });
});
