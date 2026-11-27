/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, NO_CONTEXT, type Plan } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { cheapestDish } from '../src/assistant/gathering/meal-menu.js';
import { priceOrder } from '../src/assistant/gathering/meal-price.js';
import { wordlessMealSentence } from '../src/assistant/gathering/plan-reply.js';
import { planMeal } from '../src/assistant/gathering/plan-tools.js';

// A meal plan with a price ceiling (P05 ticket 53, the design page "밥 조건 두 가지" § 2): "5천원 이하로 저녁" puts the
// Restaurants whose list price is at or under it first, the others after them, and the reply names the condition.

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const MONDAY = '2026-11-23';
const FRIDAY = '2026-11-27';

const dish = (name: string, price: number | null): { name: string; price: number | null; cuisine: null } => ({
  name,
  price,
  cuisine: null,
});

// Partitions: the corner's own price, dishes of different prices, a tie, and none with a price. Expected values: the
// dish and price the list's `priceWords` speaks of.
describe('The dish whose price the list shows', () => {
  it("is the corner's first dish at the corner's own price", () => {
    expect(cheapestDish({ price: 6500, dishes: [dish('뷔페', null), dish('샐러드', null)] })).toEqual({
      name: '뷔페',
      price: 6500,
    });
  });

  it('is the cheapest of dishes that differ', () => {
    expect(cheapestDish({ price: null, dishes: [dish('계란볶음밥', 6000), dish('라면', 3000)] })).toEqual({
      name: '라면',
      price: 3000,
    });
  });

  it('is the first of the cheapest when two cost the same', () => {
    expect(
      cheapestDish({ price: null, dishes: [dish('돈까스', 6000), dish('제육덮밥', 5000), dish('비빔밥', 5000)] }),
    ).toEqual({ name: '제육덮밥', price: 5000 });
  });

  it('is none when nothing has a price', () => {
    expect(cheapestDish({ price: null, dishes: [dish('잔치국수', null)] })).toBeNull();
  });
});

// Five Restaurants in the order the server gives them before any price, least walking first, with their list prices.
const PRICES: Record<string, number | null> = {
  두레미담: 7000,
  학생회관식당: 4500,
  예술계식당: 6000,
  소담: null,
  아워홈: 3000,
};
const FITS = Object.keys(PRICES).map((key) => ({ key }));
const priceOf = ({ key }: { key: string }): number | null => PRICES[key] ?? null;
const order = (condition: { maxPrice?: number; cheapFirst?: true }, fits = FITS): string[] =>
  priceOrder(fits, condition, priceOf).map(({ key }) => key);

// Partitions: no condition, cheapFirst alone, a ceiling that some fit, exactly at it and one won over, a ceiling with
// cheapFirst, a ceiling none fits, and no prices at all. Expected values: the ticket's order.
describe('The order of the plans with a price condition', () => {
  it('is as it was with no condition', () => {
    expect(order({})).toEqual(['두레미담', '학생회관식당', '예술계식당', '소담', '아워홈']);
  });

  it('is cheapest first with cheapFirst alone, those without a price last', () => {
    expect(order({ cheapFirst: true })).toEqual(['아워홈', '학생회관식당', '예술계식당', '두레미담', '소담']);
  });

  it('puts the fitting ones first in their order, then the others in theirs', () => {
    expect(order({ maxPrice: 5000 })).toEqual(['학생회관식당', '아워홈', '두레미담', '예술계식당', '소담']);
  });

  it('counts a price exactly at the ceiling as fitting, and one won over as not', () => {
    expect(order({ maxPrice: 4500 })).toEqual(['학생회관식당', '아워홈', '두레미담', '예술계식당', '소담']);
    expect(order({ maxPrice: 4499 })).toEqual(['아워홈', '두레미담', '학생회관식당', '예술계식당', '소담']);
  });

  it('orders the fitting ones cheapest first with cheapFirst too', () => {
    expect(order({ maxPrice: 5000, cheapFirst: true })).toEqual([
      '아워홈',
      '학생회관식당',
      '두레미담',
      '예술계식당',
      '소담',
    ]);
  });

  it('puts every plan cheapest first when none fits', () => {
    expect(order({ maxPrice: 2000 })).toEqual(['아워홈', '학생회관식당', '예술계식당', '두레미담', '소담']);
  });

  it('keeps the order when no plan has a price', () => {
    const unpriced = [{ key: '소담' }, { key: '없는곳' }];

    expect(order({ maxPrice: 5000 }, unpriced)).toEqual(['소담', '없는곳']);
  });
});

function planAt(id: string, dishes: { name: string; price: number | null; cuisine: null }[]): Plan {
  return {
    id,
    title: `${id}에서 저녁`,
    place: { placeId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', label: id, latitude: 0, longitude: 0 },
    startAt: `${MONDAY}T18:00:00+09:00`,
    endAt: `${MONDAY}T19:00:00+09:00`,
    togetherMinutes: 60,
    meeting: null,
    parts: [],
    subQuests: [],
    lines: [],
    basis: [],
    scene: { people: [], places: [], routes: [], flags: [] },
    band: {
      range: { startAt: `${MONDAY}T17:00:00+09:00`, endAt: `${MONDAY}T19:30:00+09:00` },
      now: `${MONDAY}T16:00:00+09:00`,
      lanes: [],
      startAt: `${MONDAY}T18:00:00+09:00`,
      endAt: `${MONDAY}T19:00:00+09:00`,
      text: '18:00–19:00 · 식사 60분',
    },
    menu: { price: null, dishes, others: dishes.length - 1 },
  };
}

const STUDENT_HALL = planAt('학생회관식당', [dish('시나몬치킨스테이크', 4500), dish('제육덮밥', 5500)]);
const DUREMIDAM = planAt('두레미담', [dish('돈육순두부찌개', 7000)]);

// The planMeal tool with the plans in the order given, and the inputs it was asked with.
function stagedPlanMeal(plans: Plan[]): { tool: ReturnType<typeof planMeal>; asked: MealInput[] } {
  const asked: MealInput[] = [];
  const tool = planMeal({
    restaurantPlaceId: () => null,
    asked: (_askerId, input: MealInput) => {
      asked.push(input);
      return Promise.resolve({ input, alreadyIn: [] });
    },
    planned: (_askerId, input: MealInput) => {
      const answer: AnswerReply = { input, chips: [], plans, dropped: [], noPlan: null };
      return Promise.resolve({ answer, served: new Map() });
    },
  });
  return { tool, asked };
}

function contextWith(conditions: MealInput | null): ToolContext {
  return {
    userId: ME,
    now: new Date(`${MONDAY}T16:00:00+09:00`),
    context: { ...NO_CONTEXT, conditions },
    capabilities: new Set<ClientCapability>(['answer']),
    found: new FoundIds(),
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
}

const ON_SCREEN: MealInput = {
  kind: 'meal',
  date: MONDAY,
  meal: 'dinner',
  people: [{ userId: ME, constraints: [] }],
  window: { from: null, until: null },
  placeId: null,
  maxPrice: 5000,
  cheapFirst: true,
};

// Partitions: a condition named, kept from the screen on another day, and let go. Expected values: the ticket.
describe('planMeal asked by price', () => {
  it('puts the ceiling and cheapFirst into the input', async () => {
    const { tool, asked } = stagedPlanMeal([STUDENT_HALL]);

    await tool.run({ date: MONDAY, meal: 'dinner', maxPrice: 5000, cheapFirst: true }, contextWith(null));

    expect(asked[0]).toMatchObject({ maxPrice: 5000, cheapFirst: true });
  });

  it('keeps the condition on screen for another day and meal', async () => {
    const { tool, asked } = stagedPlanMeal([STUDENT_HALL]);

    await tool.run({ date: FRIDAY, meal: 'lunch' }, contextWith(ON_SCREEN));

    expect(asked[0]).toMatchObject({ date: FRIDAY, maxPrice: 5000, cheapFirst: true });
  });

  it("lets it go with 'any' and false", async () => {
    const { tool, asked } = stagedPlanMeal([STUDENT_HALL]);

    await tool.run({ date: MONDAY, meal: 'dinner', maxPrice: 'any', cheapFirst: false }, contextWith(ON_SCREEN));

    expect(asked[0]).not.toHaveProperty('maxPrice');
    expect(asked[0]).not.toHaveProperty('cheapFirst');
  });
});

// Partitions: some fit, none fits, and no prices. Expected values: the ticket's words for the model.
describe("planMeal's words with a price ceiling", () => {
  it("tells the model the ceiling, how many fit, and each plan's dish and price", async () => {
    const { tool } = stagedPlanMeal([STUDENT_HALL, DUREMIDAM]);

    const result = await tool.run({ date: MONDAY, meal: 'dinner', maxPrice: 5000 }, contextWith(null));

    expect(result).toMatchObject({
      result: 'planned',
      maxPrice: 5000,
      fitting: 1,
      plans: [
        { restaurant: '학생회관식당', cheapest: '시나몬치킨스테이크 4,500원', fits: true },
        { restaurant: '두레미담', cheapest: '돈육순두부찌개 7,000원', fits: false },
      ],
    });
  });

  it('tells the model that none is under the ceiling', async () => {
    const { tool } = stagedPlanMeal([DUREMIDAM]);

    const result = await tool.run({ date: MONDAY, meal: 'dinner', maxPrice: 5000 }, contextWith(null));

    expect(result).toMatchObject({ maxPrice: 5000, fitting: 0, noneUnder: true });
  });

  it('tells the model when no plan has a price', async () => {
    const { tool } = stagedPlanMeal([planAt('소담', [dish('잔치국수', null)])]);

    const result = await tool.run({ date: MONDAY, meal: 'dinner', maxPrice: 5000 }, contextWith(null));

    expect(result).toMatchObject({ maxPrice: 5000, pricesUnknown: true });
    expect(result).not.toHaveProperty('noneUnder');
  });
});

function answerWith(condition: { maxPrice?: number; cheapFirst?: true }, plans: Plan[]): AnswerReply {
  const { maxPrice: _maxPrice, cheapFirst: _cheapFirst, ...base } = ON_SCREEN;
  return { input: { ...base, ...condition }, chips: [], plans, dropped: [], noPlan: null };
}

// Partitions: some fit, none fits, no prices, and cheapFirst alone. Expected values: the ticket's sentences.
describe("The server's sentence with a price condition", () => {
  it('names the ceiling when the first plan fits', () => {
    expect(wordlessMealSentence(answerWith({ maxPrice: 5000 }, [STUDENT_HALL, DUREMIDAM]))).toBe(
      '5,000원 이하로는 가장 덜 걷는 학생회관식당을 추천해요.',
    );
  });

  it('says none is under it and recommends the cheapest', () => {
    expect(wordlessMealSentence(answerWith({ maxPrice: 3000 }, [STUDENT_HALL, DUREMIDAM]))).toBe(
      '3,000원 이하는 없어서, 가장 싼 4,500원부터인 학생회관식당을 추천해요.',
    );
  });

  it('says the menus are not posted when no plan has a price', () => {
    const unpriced = planAt('소담', [dish('잔치국수', null)]);

    expect(wordlessMealSentence(answerWith({ maxPrice: 5000 }, [unpriced]))).toBe(
      '메뉴가 아직 올라오지 않아 가격으로 거르지 못해서, 가장 덜 걷는 소담을 추천해요.',
    );
  });

  it('recommends the cheapest with cheapFirst alone', () => {
    expect(wordlessMealSentence(answerWith({ cheapFirst: true }, [STUDENT_HALL]))).toBe(
      '가장 싼 4,500원부터인 학생회관식당을 추천해요.',
    );
  });
});
