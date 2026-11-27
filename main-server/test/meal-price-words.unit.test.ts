/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, NO_CONTEXT, type Plan } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { listPrice } from '../src/assistant/gathering/meal-menu.js';
import { planMeal } from '../src/assistant/gathering/plan-tools.js';

// The prices planMeal gives the model are the list's (P05 ticket 50). On the user's phone (2026-11-26), "5천원 이하로
// 저녁" was answered that the plan's Restaurant cost 6,000원, while the list under it said "3,000원부터". Expected
// values: the list's words, by the app's `priceWords`.

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const MONDAY = '2026-11-23';

const dish = (name: string, price: number | null): { name: string; price: number | null; cuisine: null } => ({
  name,
  price,
  cuisine: null,
});

// Partitions: the corner's own price, dishes of different prices, of one price, and none with a price.
describe("A plan's price as the list writes it", () => {
  it("is the corner's own price, a buffet's", () => {
    expect(listPrice({ price: 6500, dishes: [dish('뷔페', null)] })).toBe('6,500원');
  });

  it('is the lowest of the dishes with 부터 when they differ', () => {
    expect(listPrice({ price: null, dishes: [dish('계란볶음밥', 6000), dish('어묵', 3000)] })).toBe('3,000원부터');
  });

  it('is the one price when every dish has it', () => {
    expect(listPrice({ price: null, dishes: [dish('제육덮밥', 5000), dish('돈까스', 5000)] })).toBe('5,000원');
  });

  it('is none when nothing has a price', () => {
    expect(listPrice({ price: null, dishes: [dish('잔치국수', null)] })).toBeNull();
  });
});

const PLAN: Plan = {
  id: '아워홈(901동)',
  title: '아워홈(901동)에서 저녁',
  place: { placeId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', label: '아워홈(901동)', latitude: 0, longitude: 0 },
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
  menu: { price: null, dishes: [dish('계란볶음밥', 6000), dish('어묵', 3000)], others: 1 },
};

function planned(): ReturnType<typeof planMeal> {
  return planMeal({
    restaurantPlaceId: () => null,
    asked: (_askerId, input: MealInput) => Promise.resolve({ input, alreadyIn: [] }),
    planned: (_askerId, input: MealInput) => {
      const answer: AnswerReply = { input, chips: [], plans: [PLAN], dropped: [], noPlan: null };
      return Promise.resolve({ answer, served: new Map() });
    },
  });
}

const context: ToolContext = {
  userId: ME,
  now: new Date(`${MONDAY}T16:00:00+09:00`),
  context: { ...NO_CONTEXT },
  capabilities: new Set<ClientCapability>(['answer']),
  found: new FoundIds(),
  shown: null,
  presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
  judged: new Map(),
  restaurants: new Map(),
};

describe('planMeal asked by price', () => {
  it("gives each plan's price as the list writes it", async () => {
    const result = await planned().run({ date: MONDAY, meal: 'dinner' }, context);

    expect(result).toMatchObject({ result: 'planned', plans: [{ restaurant: '아워홈(901동)', price: '3,000원부터' }] });
  });
});
