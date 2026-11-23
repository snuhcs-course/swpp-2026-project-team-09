/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { mealStateOf } from '../src/assistant/lookup/hours-lookup.js';
import { HOURS_RULES, restaurantHours } from '../src/assistant/lookup/hours-tools.js';
import { hoursWords, type MealOfDay } from '../src/assistant/lookup/hours-words.js';
import { MenuLineKind } from '../src/generated/prisma/client.js';

// The map's label of an hours answer speaks of the meal asked (P05 ticket 43): "학생회관 언제까지 해?" at 12:40 labels
// the Restaurant "지금 영업 중 · 14:00까지", and the follow-up "저녁은?" labels it with dinner, never with lunch's state.
// On Monday 2026-11-23 학생회관식당 serves lunch 11:00–14:00 and dinner 17:00–19:00; lines and hours are made by hand.

const MONDAY = '2026-11-23';
const NEXT_MONDAY = '2026-11-30';
const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const at = (clock: string): Date => new Date(`${MONDAY}T${clock}:00+09:00`);

const dish = { text: '제육볶음 : 6,000원', kind: MenuLineKind.dish, name: '제육볶음', price: 6000 };
const LUNCH = { opensAt: '11:00', closesAt: '14:00' };
const DINNER = { opensAt: '17:00', closesAt: '19:00' };
const both = (): MealOfDay[] => [
  { meal: 'lunch', lines: [dish], hours: LUNCH, posted: true },
  { meal: 'dinner', lines: [dish], hours: DINNER, posted: true },
];
const PLACE = {
  id: 'b0c2e3a4-0000-4000-8000-000000000063',
  number: '63',
  name: '학생회관',
  latitude: 37.4593,
  longitude: 126.9506,
};

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

const tool = restaurantHours({
  named: () => ['학생회관식당'],
  at: () => [],
  mealsOf: () => Promise.resolve(both()),
  placeOf: () => PLACE,
  replan: () => Promise.reject(new Error('No meal plan on screen')),
});

const labelOf = (context: ToolContext): string | undefined =>
  context.presented.lookup?.scene.flags.find(({ role }) => role === 'place')?.text;

describe('"학생회관 언제까지 해?", then "저녁은?", at 12:40', () => {
  it('labels the first answer with the state now, and the follow-up with dinner', async () => {
    const first = contextAt(at('12:40'));
    await tool.run({ date: MONDAY, restaurant: '학생회관' }, first);
    const followUp = contextAt(at('12:40'));
    await tool.run({ date: MONDAY, restaurant: '학생회관', meal: 'dinner' }, followUp);

    expect(labelOf(first)).toBe('학생회관식당 · 지금 영업 중 · 14:00까지');
    expect(labelOf(followUp)).toBe('학생회관식당 · 저녁 17:00–19:00');
    expect(followUp.presented.lookup?.lines[1]).toEqual([{ text: '저녁 17:00–19:00', strong: false }]);
  });

  it('tells the model to call again for another meal, never to answer it in words alone', () => {
    expect(HOURS_RULES).toContain('A follow-up about another meal or day of the same Restaurant');
  });
});

const stateAt = (date: string, clock: string, meals: MealOfDay[], meal: 'lunch' | 'dinner'): string => {
  const found = hoursWords('학생회관식당', date, at(clock), meals);
  if (found.result !== 'found') {
    throw new Error('No hours');
  }
  return mealStateOf(found, meal, at(clock));
};

describe('The label of the meal asked', () => {
  it('says it is serving now, until when, during that meal', () => {
    expect(stateAt(MONDAY, '17:30', both(), 'dinner')).toBe('저녁 · 지금 영업 중 · 19:00까지');
  });

  it('gives its hours outside them', () => {
    expect(stateAt(MONDAY, '12:40', both(), 'lunch')).toBe('점심 · 지금 영업 중 · 14:00까지');
    expect(stateAt(MONDAY, '15:00', both(), 'lunch')).toBe('점심 11:00–14:00');
  });

  it('says a meal with no line on a posted day is not served', () => {
    const lunchOnly: MealOfDay[] = [
      { meal: 'lunch', lines: [dish], hours: LUNCH, posted: true },
      { meal: 'dinner', lines: [], hours: DINNER, posted: true },
    ];

    expect(stateAt(MONDAY, '12:40', lunchOnly, 'dinner')).toBe('저녁은 안 해요');
  });

  it('gives the usual hours on a day not posted yet', () => {
    const notPosted: MealOfDay[] = [{ meal: 'dinner', lines: [], hours: DINNER }];

    expect(stateAt(NEXT_MONDAY, '12:40', notPosted, 'dinner')).toBe('평소 저녁 17:00–19:00');
  });
});

describe('The label of a meal served now against one later today', () => {
  it('says 지금 영업 중 only for the meal being served, and the hours of one not started', () => {
    expect(stateAt(MONDAY, '17:30', both(), 'dinner')).toBe('저녁 · 지금 영업 중 · 19:00까지');
    expect(stateAt(MONDAY, '12:40', both(), 'dinner')).toBe('저녁 17:00–19:00');
  });
});

// 예술계식당's lunch as the Co-op page gives it: each corner's time is a note after its dish line.
const note = (text: string): MealOfDay['lines'][number] => ({ text, kind: MenuLineKind.note, name: null, price: null });
const byCorner = (): MealOfDay[] => [
  {
    meal: 'lunch',
    lines: [
      { ...dish, text: '<A코너>제육김치덮밥 : 6,000원' },
      note('※ 운영시간 : 11:30 ~ 14:00'),
      { ...dish, text: '<B코너>오므라이스 : 6,500원' },
      note('※ 운영시간 : 11:30 ~ 13:00'),
    ],
    hours: null,
    posted: true,
  },
];

describe('A Restaurant whose corners have their own times', () => {
  it('keeps the label short, the span of its corners, and puts the corners in the card', async () => {
    const corners = restaurantHours({
      named: () => ['예술계식당'],
      at: () => [],
      mealsOf: () => Promise.resolve(byCorner()),
      placeOf: () => PLACE,
      replan: () => Promise.reject(new Error('No meal plan on screen')),
    });
    const context = contextAt(at('15:00'));

    await corners.run({ date: MONDAY, restaurant: '예술계', meal: 'lunch' }, context);

    expect(labelOf(context)).toBe('예술계식당 · 점심 11:30–14:00');
    expect(context.presented.lookup?.basis).toEqual(['점심 A코너 11:30–14:00, B코너 11:30–13:00']);
  });
});
