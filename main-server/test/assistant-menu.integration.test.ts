/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { MENU_RULES } from '../src/assistant/lookup/menu-tools.js';
import { MealPlanStage } from './meal-plan.js';
import { menusMessage, restaurant } from './menus.js';
import { type Step } from './scripted-model.js';
import { sendAsWorker } from './worker.js';

// A Restaurant's menu drawn on the map as a Lookup, at the Assistant's endpoint with the scripted model, the seed's
// walking table, Places, and Restaurants, and the menus the tests post: board q8 (a Tuesday at 11:40, in a Class in
// 301동 until 11:50) through the real meal Plan, what the model is given, a menu not collected or closed, words that
// name several Restaurants, a question that names none, and an app that does not draw answers. Each test takes a
// Tuesday of 2086, which no other file posts menus for.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const replySchema = z.object({
  text: z.string(),
  mapButtons: z.array(z.string()),
  answer: z.custom<AnswerReply | null>(),
  lookup: z.custom<Lookup | null>(),
});

function lookupIn(body: unknown): Lookup {
  const { lookup } = replySchema.parse(body);
  if (lookup === null) {
    throw new Error('The reply has no Lookup');
  }
  return lookup;
}

const findMenu = (date: string, words?: string): Step => ({
  tool: 'findMenu',
  input: { date, meal: 'lunch', ...(words === undefined ? {} : { restaurant: words }) },
});

const time = (date: string, clock: string): string => `${date}T${clock}:00+09:00`;

// The asker of board q8 at 11:40: a Class in 301동 until 11:50, and one in 24동 at 13:00.
async function boardQ8(date: string): Promise<void> {
  await stage.asking(date, '11:40');
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
}

// The tests' menu: 제육볶음 and a note of the hours.
const TESTS_MENU = [
  '<data label="menu.line">제육볶음 : 6,000원</data>',
  '<data label="menu.line">※ 운영시간 : 11:00~14:30</data>',
];

describe('The menu of 301동식당 at 11:40 (board q8)', () => {
  it('is drawn on the map as a Lookup, with the time to eat from the meal Plan, and no answer', async () => {
    const date = '2086-01-01';
    await boardQ8(date);
    await stage.menusOn(date, ['301동식당']);

    const response = await stage.send([findMenu(date, '301동식당'), { text: '301동식당 오늘 점심은 제육볶음이에요.' }]);

    expect(response.status).toBe(200);
    expect(replySchema.parse(response.body).answer).toBeNull();
    const lookup = lookupIn(response.body);
    expect(lookup.kind).toBe('menu');
    expect(lookup.lines).toEqual([
      [
        { text: '301동식당', strong: true },
        { text: ' 오늘 점심은 제육볶음 6,000원', strong: false },
      ],
      [{ text: '12:45까지 55분 먹을 수 있어요', strong: false }],
    ]);
    expect(lookup.band).toMatchObject({
      startAt: time(date, '11:50'),
      endAt: time(date, '12:45'),
      text: '11:50–12:45 · 식사 55분',
    });
    expect(lookup.chips.map(({ text }) => text)).toEqual(['301동에서', '13:00 수업까지']);
    expect(lookup.scene.flags).toMatchObject([{ text: '제육볶음', role: 'place' }]);
  });

  it('gives the model the menu inside the delimiters for collected text, the times, and no coordinates', async () => {
    const date = '2086-01-08';
    await boardQ8(date);
    await stage.menusOn(date, ['301동식당']);

    await stage.send([findMenu(date, '301동식당'), { text: '…' }]);

    expect(stage.model.toolResults()[0]).toEqual({
      result: 'found',
      restaurant: '301동식당',
      collectedAt: '2026-10-31T21:00:00+09:00',
      lines: TESTS_MENU,
      start: '11:50',
      end: '12:45',
      eatingMinutes: 55,
      from: '301동',
      walkMinutes: 0,
    });
  });
});

describe('A Restaurant with nothing to eat at that meal', () => {
  it('answers none when no menu of it was collected, and nothing is drawn', async () => {
    const date = '2086-01-15';
    await boardQ8(date);
    await stage.menusOn(date, ['학생회관식당']);

    const response = await stage.send([findMenu(date, '301동식당'), { text: '…' }]);

    expect(stage.model.toolResults()[0]).toEqual({
      result: 'none',
      reason: `No lunch menu of 301동식당 was collected for ${date}.`,
      lines: [],
    });
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });

  it('answers none when its lunch holds only notes, with the notes', async () => {
    const date = '2086-01-22';
    await boardQ8(date);
    const closed = { meal: 'lunch', text: '※ 개교기념일 휴무', kind: 'note', name: null, price: null };
    await sendAsWorker(
      stage.app,
      '/menus/collected',
      menusMessage([{ date, restaurants: [restaurant({ name: '301동식당', lines: [closed] })] }]),
    );

    const response = await stage.send([findMenu(date, '301동식당'), { text: '…' }]);

    expect(stage.model.toolResults()[0]).toEqual({
      result: 'none',
      reason: `301동식당 serves no lunch on ${date}: its lunch menu holds only notes.`,
      lines: ['<data label="menu.line">※ 개교기념일 휴무</data>'],
    });
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });
});

describe('Words that name several Restaurants', () => {
  it('answer them as candidates, and nothing is drawn', async () => {
    const date = '2086-01-29';
    await boardQ8(date);
    await stage.menusOn(date, ['자하연식당 2층', '자하연식당 3층']);

    const response = await stage.send([findMenu(date, '자하연'), { text: '…' }]);

    expect(stage.model.toolResults()[0]).toEqual({
      result: 'several',
      candidates: [{ name: '자하연식당 2층' }, { name: '자하연식당 3층' }],
      more: false,
    });
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });

  it('answer the one the User then names, whose Place it shares with the other', async () => {
    const date = '2086-02-05';
    await boardQ8(date);
    await stage.menusOn(date, ['자하연식당 2층', '자하연식당 3층']);

    const response = await stage.send([findMenu(date, '자하연식당 3층'), { text: '…' }]);

    const lookup = lookupIn(response.body);
    expect(lookup.scene.places.filter(({ role }) => role === 'pick' || role === 'candidate')).toMatchObject([
      { role: 'pick', tag: '자하연식당 3층' },
    ]);
    expect(lookup.lines[0]?.[0]).toEqual({ text: '자하연식당 3층', strong: true });
  });
});

describe('A question about menus that names no Restaurant', () => {
  it('is answered with getMenus as today, with no Lookup', async () => {
    const date = '2086-02-12';
    await boardQ8(date);
    await stage.menusOn(date, ['301동식당', '학생회관식당']);

    const response = await stage.send([
      { tool: 'getMenus', input: { date, meal: 'lunch' } },
      { tool: 'showOnMap', input: { layer: 'dining' } },
      { text: '…' },
    ]);

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'found', date });
    const { lookup, mapButtons } = replySchema.parse(response.body);
    expect(lookup).toBeNull();
    expect(mapButtons).toEqual(['dining']);
  });
});

// The names of the tools the model was offered on its first call.
const toolNames = (): string[] => (stage.model.received()[0]?.tools ?? []).map(({ name }) => name);

describe('An app that does not draw answers', () => {
  it('is not offered findMenu nor told its rules', async () => {
    await stage.asking('2086-02-19', '11:40');

    await stage.send([{ text: '네' }], { clientCapabilities: ['library'] });

    expect(toolNames()).not.toContain('findMenu');
    expect(toolNames()).toContain('getMenus');
    expect(stage.model.system()).not.toContain(MENU_RULES);
  });

  it('is told apart from one that does, which is offered findMenu with its rules', async () => {
    await stage.asking('2086-02-19', '11:40');

    await stage.send([{ text: '네' }]);

    expect(toolNames()).toContain('findMenu');
    expect(stage.model.system()).toContain(MENU_RULES);
  });
});
