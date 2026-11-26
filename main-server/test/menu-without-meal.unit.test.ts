/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup, NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { findMenu } from '../src/assistant/lookup/menu-tools.js';

// A Restaurant's menu asked with no meal (P05 ticket 52). On the user's phone (2026-11-26), "내일 예술계 메뉴" was
// answered in text, both meals as lists with when they were collected, and nothing opened on the map: findMenu took
// only lunch or dinner, so the model reached for getMenus. Now findMenu takes no meal too, and opens the one nearest in
// time. Expected values: the meal by the clock, as planMeal takes it (`mealByClock`), lunch ending at 14:30.

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const TODAY = '2026-11-26';
const TOMORROW = '2026-11-27';

const NONE: Lookup = {
  kind: 'place',
  chips: [],
  lines: [],
  basis: [],
  scene: { people: [], places: [], routes: [], flags: [] },
  band: null,
  actions: [],
};

// The meal findMenu asked the menus for, which says none, so that no answer needs drawing.
async function mealAsked(input: { date: string; meal?: 'lunch' | 'dinner' }, clock: string): Promise<string> {
  const asked: string[] = [];
  const tool = findMenu({
    named: () => ['예술계식당'],
    at: () => [],
    find: (_userId, { meal }) => {
      asked.push(meal);
      return Promise.resolve({ result: 'none', reason: 'no-menu', lines: [], lookup: NONE });
    },
  });
  const context: ToolContext = {
    userId: ME,
    now: new Date(`${TODAY}T${clock}:00+09:00`),
    context: NO_CONTEXT,
    capabilities: new Set<ClientCapability>(['answer']),
    found: new FoundIds(),
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
  await tool.run({ ...input, restaurant: '예술계' }, context);
  return asked.join();
}

// Partitions: another day; today before lunch ends, after it, and after dinner; a meal named.
describe('A menu asked with no meal', () => {
  it("opens another day's lunch", async () => {
    expect(await mealAsked({ date: TOMORROW }, '16:30')).toBe('lunch');
  });

  it.each([
    ['10:00', 'lunch'],
    ['14:00', 'lunch'],
    ['15:00', 'dinner'],
    ['21:00', 'dinner'],
  ])("opens today's meal served at %s or next: %s", async (clock, meal) => {
    expect(await mealAsked({ date: TODAY }, clock)).toBe(meal);
  });

  it('opens the meal the User named', async () => {
    expect(await mealAsked({ date: TOMORROW, meal: 'dinner' }, '10:00')).toBe('dinner');
  });
});
