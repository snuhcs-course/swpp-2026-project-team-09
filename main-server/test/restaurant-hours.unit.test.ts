/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { restaurantHours } from '../src/assistant/lookup/hours-tools.js';
import { stateOf } from '../src/assistant/lookup/hours-lookup.js';
import { hoursWords, type MealOfDay, noteHours } from '../src/assistant/lookup/hours-words.js';
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

  it('says a meal served with no hours recorded and no times in its notes, with the notes', () => {
    const meals: MealOfDay[] = [
      { meal: 'dinner', lines: [dish('김치찌개'), note('※ 운영시간은 학기 중에 바뀌어요')], hours: null },
    ];

    expect(hoursWords('예술계식당', TUESDAY, at(TUESDAY, '10:00'), meals)).toMatchObject({
      servingNow: null,
      meals: [
        {
          meal: 'dinner',
          serves: true,
          hours: 'not recorded',
          notes: ['<data label="menu.line">※ 운영시간은 학기 중에 바뀌어요</data>'],
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

const PLACE = {
  id: 'b0c2e3a4-0000-4000-8000-000000000049',
  number: '49',
  name: '예술계복합연구동',
  latitude: 37.466,
  longitude: 126.955,
};
const POINT = { latitude: 37.466, longitude: 126.955 };

// The tool over hand-made reads: 예술계식당 alone is named by 예술계, and a meal answer planned again is recorded.
function toolOf(): { tool: ReturnType<typeof restaurantHours>; replanned: MealInput[] } {
  const replanned: MealInput[] = [];
  const tool = restaurantHours({
    named: (words) => (words === '예술계' ? ['예술계식당'] : []),
    at: () => [],
    mealsOf: () => Promise.resolve(served()),
    placeOf: () => PLACE,
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

  it('shows the Restaurant on the map without a meal plan on screen, its label saying its state now', async () => {
    const { tool, replanned } = toolOf();
    const context = contextAt(at(TUESDAY, '12:30'), null);

    await tool.run({ date: TUESDAY, restaurant: '예술계' }, context);

    expect(replanned).toEqual([]);
    expect(context.presented.answer).toBeNull();
    expect(context.presented.lookup?.scene).toEqual({
      people: [],
      places: [{ place: { placeId: PLACE.id, label: '예술계식당', ...POINT }, role: 'pick', tag: '예술계식당' }],
      routes: [],
      flags: [{ at: POINT, text: '예술계식당 · 지금 영업 중 · 14:00까지', role: 'place' }],
    });
    expect(context.presented.lookup?.basis).toEqual(['점심 11:30–14:00', '저녁 17:00–18:30']);
  });

  it('keeps the meal plan on screen in place of the Restaurant', async () => {
    const { tool } = toolOf();
    const context = contextAt(at(TUESDAY, '12:30'), MEAL_ON_SCREEN);

    await tool.run({ date: TUESDAY, restaurant: '예술계' }, context);

    expect(context.presented.lookup).toBeNull();
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

// 예술계식당's lunch as the Co-op page gave it on 2026-10-01: each corner's time is a note after its dish line.
const ARTS_LUNCH: MenuLineDto[] = [
  dish('<A코너>제육김치덮밥, 잡채, 떡꼬치구이 : 6,000원'),
  note('※ 운영시간 : 11:30 ~ 14:00'),
  dish('<B코너>오므라이스, 까르보떡볶이, 수제소시지구이 : 6,500원'),
  note('※ 운영시간 : 11:30 ~ 13:00'),
  dish('<C코너>셀프라면,밥,김치 : 3,000원'),
];

describe("Times a meal's notes give, with no hours kept", () => {
  it('reads each with the corner of the dish line it follows', () => {
    expect(noteHours(ARTS_LUNCH)).toEqual([
      { corner: 'A코너', opensAt: '11:30', closesAt: '14:00' },
      { corner: 'B코너', opensAt: '11:30', closesAt: '13:00' },
    ]);
  });

  it('gives the lunch by corner, and serving now while any corner is open', () => {
    const meals: MealOfDay[] = [{ meal: 'lunch', lines: ARTS_LUNCH, hours: null }];

    expect(hoursWords('예술계식당', TUESDAY, at(TUESDAY, '13:30'), meals)).toMatchObject({
      servingNow: 'lunch',
      meals: [
        {
          meal: 'lunch',
          serves: true,
          byCorner: [
            { corner: 'A코너', opensAt: '11:30', closesAt: '14:00' },
            { corner: 'B코너', opensAt: '11:30', closesAt: '13:00' },
          ],
        },
      ],
    });
  });

  it("gives a single time with no corner as the meal's hours", () => {
    const meals: MealOfDay[] = [
      { meal: 'dinner', lines: [dish('치킨까스정식'), note('※ 운영시간 : 17:00 ~ 18:30')], hours: null },
    ];

    expect(hoursWords('예술계식당', TUESDAY, at(TUESDAY, '10:00'), meals)).toMatchObject({
      meals: [{ meal: 'dinner', serves: true, opensAt: '17:00', closesAt: '18:30' }],
    });
  });
});

const stateAt = (date: string, clock: string, meals = served()): string => {
  const found = hoursWords('학생회관식당', date, at(date, clock), meals);
  if (found.result !== 'found') {
    throw new Error('No hours');
  }
  return stateOf(found, at(date, clock));
};
const withBreakfast = (): MealOfDay[] => [
  { meal: 'breakfast', lines: [dish('토스트')], hours: { opensAt: '08:00', closesAt: '10:00' } },
  ...served(),
];

describe('The state the map writes beside the Restaurant', () => {
  it.each([
    ['00:40', '지금 닫음 · 08:00 아침'],
    ['09:00', '지금 영업 중 · 10:00까지'],
    ['10:30', '지금 닫음 · 11:30 점심'],
    ['14:00', '지금 닫음 · 17:00 저녁'],
    ['19:00', '지금 닫음 · 오늘 영업 끝'],
  ])('at %s is "%s"', (clock, state) => {
    expect(stateAt(TUESDAY, clock, withBreakfast())).toBe(state);
  });

  it('closes a lunch by corner at the latest corner', () => {
    expect(stateAt(TUESDAY, '12:00', [{ meal: 'lunch', lines: ARTS_LUNCH, hours: null }])).toBe(
      '지금 영업 중 · 14:00까지',
    );
  });

  it("says another day's spans", () => {
    const found = hoursWords('예술계식당', TUESDAY, at('2026-11-23', '00:40'), served());
    if (found.result !== 'found') {
      throw new Error('No hours');
    }
    expect(stateOf(found, at('2026-11-23', '00:40'))).toBe('점심 11:30–14:00 · 저녁 17:00–18:30');
  });
});
