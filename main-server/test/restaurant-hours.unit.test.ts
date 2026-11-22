/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { restaurantHours } from '../src/assistant/lookup/hours-tools.js';
import { hoursWords, type MealOfDay } from '../src/assistant/lookup/hours-words.js';
import { MenuLineKind } from '../src/generated/prisma/client.js';
import { type MenuLineDto } from '../src/menus/dto/restaurant-menus.dto.js';

// When a Restaurant serves each meal, as the model is given it (P05 ticket 36). On Tuesday 2026-11-24 예술계식당 serves
// lunch 11:30–14:00 and dinner 17:00–18:30; the lines and hours are made by hand.

const TUESDAY = '2026-11-24';
const SUNDAY = '2026-11-29';
const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const at = (date: string, clock: string): Date => new Date(`${date}T${clock}:00+09:00`);

const dish = (text: string): MenuLineDto => ({ text, kind: MenuLineKind.dish, name: text, price: 5000 });
const note = (text: string): MenuLineDto => ({ text, kind: MenuLineKind.note, name: null, price: null });
const LUNCH = { opensAt: '11:30', closesAt: '14:00' };
const DINNER = { opensAt: '17:00', closesAt: '18:30' };

const served = (): MealOfDay[] => [
  { meal: 'breakfast', lines: [], hours: null },
  { meal: 'lunch', lines: [dish('제육볶음')], hours: LUNCH },
  { meal: 'dinner', lines: [dish('김치찌개')], hours: DINNER },
];

describe('A Restaurant serving lunch and dinner today', () => {
  it('gives each meal it serves with its hours, leaving breakfast out, and what it serves now', () => {
    expect(hoursWords('예술계식당', TUESDAY, at(TUESDAY, '12:30'), served())).toEqual({
      result: 'found',
      restaurant: '예술계식당',
      date: TUESDAY,
      now: '12:30',
      servingNow: 'lunch',
      meals: [
        { meal: 'lunch', serves: true, opensAt: '11:30', closesAt: '14:00' },
        { meal: 'dinner', serves: true, opensAt: '17:00', closesAt: '18:30' },
      ],
    });
  });

  it.each([
    ['11:29', 'a minute before lunch opens', null],
    ['11:30', 'as lunch opens', 'lunch'],
    ['13:59', "in lunch's last minute", 'lunch'],
    ['14:00', 'as lunch closes', null],
    ['17:30', 'during dinner', 'dinner'],
    ['18:30', 'as dinner closes', null],
  ])('at %s, %s, is serving %s', (clock, _when, meal) => {
    expect(hoursWords('예술계식당', TUESDAY, at(TUESDAY, clock), served())).toMatchObject({ servingNow: meal });
  });
});

describe('Another day', () => {
  it('gives the hours with neither now nor what it serves now', () => {
    const words = hoursWords('예술계식당', TUESDAY, at('2026-11-23', '00:40'), served());

    expect(words).not.toHaveProperty('now');
    expect(words).not.toHaveProperty('servingNow');
  });

  it("gives a meal whose menu is not collected yet with its page's usual hours", () => {
    const meals: MealOfDay[] = [{ meal: 'lunch', lines: [], hours: LUNCH }];

    expect(hoursWords('예술계식당', TUESDAY, at('2026-11-23', '00:40'), meals)).toMatchObject({
      meals: [{ meal: 'lunch', serves: 'not known', usualOpensAt: '11:30', usualClosesAt: '14:00' }],
    });
  });
});

describe('A meal it does not serve, or serves without hours', () => {
  it('says a meal whose menu holds only notes is not served, with the notes', () => {
    const meals: MealOfDay[] = [{ meal: 'lunch', lines: [note('※ 일요일 휴무')], hours: LUNCH }];

    expect(hoursWords('예술계식당', SUNDAY, at(SUNDAY, '10:00'), meals)).toMatchObject({
      servingNow: null,
      meals: [{ meal: 'lunch', serves: false, notes: ['<data label="menu.line">※ 일요일 휴무</data>'] }],
    });
  });

  it('says a meal served with no hours recorded, with the notes that may state them', () => {
    const meals: MealOfDay[] = [
      { meal: 'dinner', lines: [dish('김치찌개'), note('※ 운영시간 17:00~19:00')], hours: null },
    ];

    expect(hoursWords('예술계식당', TUESDAY, at(TUESDAY, '10:00'), meals)).toMatchObject({
      servingNow: null,
      meals: [
        {
          meal: 'dinner',
          serves: true,
          hours: 'not recorded',
          notes: ['<data label="menu.line">※ 운영시간 17:00~19:00</data>'],
        },
      ],
    });
  });

  it('is none when neither a menu nor hours are known', () => {
    expect(
      hoursWords('예술계식당', TUESDAY, at(TUESDAY, '10:00'), [{ meal: 'lunch', lines: [], hours: null }]),
    ).toEqual({
      result: 'none',
      reason: 'No menu of 예술계식당 was collected for 2026-11-24, and its page never gave its hours.',
    });
  });
});

const MEAL_ON_SCREEN: MealInput = {
  kind: 'meal',
  date: TUESDAY,
  meal: 'lunch',
  people: [{ userId: ME, constraints: [] }],
  window: { from: null, until: null },
  placeId: null,
};

// The tool over hand-made reads: 예술계식당 alone is named by 예술계, and a meal answer planned again is recorded.
function toolOf(): { tool: ReturnType<typeof restaurantHours>; replanned: MealInput[] } {
  const replanned: MealInput[] = [];
  const tool = restaurantHours({
    named: (words) => (words === '예술계' ? ['예술계식당'] : []),
    at: () => [],
    mealsOf: () => Promise.resolve(served()),
    replan: (_userId, input) => {
      replanned.push(input);
      const answer: AnswerReply = { input, chips: [], plans: [], dropped: [], noPlan: null };
      return Promise.resolve(answer);
    },
  });
  return { tool, replanned };
}

function contextAt(now: Date, conditions: MealInput | null): ToolContext {
  return {
    userId: ME,
    now,
    context: { ...NO_CONTEXT, conditions },
    capabilities: new Set<ClientCapability>(['library', 'answer']),
    found: new FoundIds(),
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
}

describe('restaurantHours', () => {
  it('answers the hours, and plans the meal on screen again so that the reply keeps it', async () => {
    const { tool, replanned } = toolOf();
    const context = contextAt(at(TUESDAY, '12:30'), MEAL_ON_SCREEN);

    const result = await tool.run({ date: TUESDAY, restaurant: '예술계' }, context);

    expect(result).toMatchObject({ result: 'found', restaurant: '예술계식당', servingNow: 'lunch' });
    expect(replanned).toEqual([MEAL_ON_SCREEN]);
    expect(context.presented.answer?.input).toEqual(MEAL_ON_SCREEN);
  });

  it('draws nothing without a meal plan on screen', async () => {
    const { tool, replanned } = toolOf();
    const context = contextAt(at(TUESDAY, '12:30'), null);

    await tool.run({ date: TUESDAY, restaurant: '예술계' }, context);

    expect(replanned).toEqual([]);
    expect(context.presented.answer).toBeNull();
  });

  it('answers none for words that name no Restaurant', async () => {
    const { tool } = toolOf();

    expect(
      await tool.run({ date: TUESDAY, restaurant: '없는식당' }, contextAt(at(TUESDAY, '12:30'), null)),
    ).toMatchObject({
      result: 'none',
    });
  });
});
