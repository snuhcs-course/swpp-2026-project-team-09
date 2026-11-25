/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage } from './meal-plan.js';
import { menusMessage, restaurant } from './menus.js';
import { type Step } from './scripted-model.js';
import { sendAsWorker } from './worker.js';

// A Restaurant whose menu closes the meal asked is no candidate (P04 ticket 65): on 2026-11-26 302동식당's lunch and
// dinner each held only "공대수시면접으로 인해 휴점합니다", which the worker gives no kind, and a plan for that dinner
// offered it first. The answer names it apart with its notice, which the app lists under "쉬는 곳", and asked why it is
// missing, the Assistant says so from whyNotListed (P04 ticket 71). At the Assistant's endpoint with the scripted model;
// each test takes a Tuesday of March 2074, which no other file posts menus for, with the asker in a Class in 301동 until
// 17:50.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const replySchema = z.object({ answer: z.custom<AnswerReply | null>(), lookup: z.custom<Lookup | null>() });

const NOTICE = '공대수시면접으로 인해 휴점합니다';
const line = (meal: string, text: string, kind: string | null = null): object => ({
  meal,
  text,
  kind,
  name: null,
  price: null,
});
const dish = (meal: string, name: string): object => ({
  meal,
  text: `${name} : 6,000원`,
  kind: 'dish',
  name,
  price: 6000,
});
const closedAllDay = (text: string, kind: string | null = null): object[] => [
  line('lunch', text, kind),
  line('dinner', text, kind),
];

const why = (words: string): Step => ({ tool: 'whyNotListed', input: { restaurant: words } });

const planDinner = (date: string): Step => ({ tool: 'planMeal', input: { date, meal: 'dinner', friendIds: [] } });

async function dinnerAt(date: string, menus: Record<string, object[]>): Promise<void> {
  await stage.asking(date, '16:40');
  const restaurants = Object.entries(menus).map(([name, lines]) => restaurant({ name, lines }));
  await sendAsWorker(stage.app, '/menus/collected', menusMessage([{ date, restaurants }]));
  await stage.classAt(stage.asker, '16:00', '17:50', '301');
}

function answerIn(body: unknown): AnswerReply {
  const { answer } = replySchema.parse(body);
  if (answer === null) {
    throw new Error('The reply has no answer');
  }
  return answer;
}

function lookupIn(body: unknown): Lookup {
  const { lookup } = replySchema.parse(body);
  if (lookup === null) {
    throw new Error('The reply has no Lookup');
  }
  return lookup;
}

describe('A plan for a meal some Restaurants close', () => {
  it('offers only the open ones, names the closed one apart with its notice, and no numbered Place on the map', async () => {
    const date = '2074-03-06';
    await dinnerAt(date, {
      '302동식당': closedAllDay(NOTICE),
      '301동식당': [dish('dinner', '제육볶음')],
      학생회관식당: [dish('dinner', '돈까스')],
    });

    const answer = answerIn((await stage.send([planDinner(date), { text: '…' }]).expect(200)).body);

    expect(answer.plans.map(({ id }) => id).toSorted()).toEqual(['301동식당', '학생회관식당']);
    const drawn = answer.plans.flatMap(({ scene }) => scene.places.map(({ place }) => place.label));
    expect(drawn).not.toContain('302동식당');
    const [result] = stage.model.toolResults();
    expect(JSON.stringify(result)).not.toContain('302동식당');
    expect(answer.closed?.map(({ place, notices }) => [place.label, notices])).toEqual([['302동식당', [NOTICE]]]);
  });

  it('says plainly that no Restaurant is open when every one closes it', async () => {
    const date = '2074-03-13';
    await dinnerAt(date, {
      '302동식당': closedAllDay(NOTICE),
      학생회관식당: closedAllDay('정전으로 인한 휴무', 'note'),
      예술계식당: closedAllDay('공휴일 운영없음'),
    });

    const answer = answerIn((await stage.send([planDinner(date), { text: '…' }]).expect(200)).body);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan).toMatchObject({ reason: 'no-menu', lines: [[{ text: '저녁에 여는 식당이 없어요' }]] });
    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'none',
      reason: 'No Restaurant serves that meal that day: every menu collected for it is closed or holds only notes.',
    });
  });
});

describe('A Restaurant closed for the meal it could not have been eaten at anyway', () => {
  // The user's word (2026-11-26): a closed one that could not be reached and eaten at in the time anyway is not named.
  // 학생회관식당's last dinner served at 17:30 is before the asker's Class ends at 17:50.
  it('is not named apart: only one that would have been a candidate is', async () => {
    const date = '2074-04-03';
    await dinnerAt(date, {
      '302동식당': closedAllDay(NOTICE),
      학생회관식당: closedAllDay(NOTICE),
      '301동식당': [dish('dinner', '제육볶음')],
    });
    stage.hoursAre({ 학생회관식당: { dinner: { opensAt: '17:00', closesAt: '17:30' } } });

    const answer = answerIn((await stage.send([planDinner(date), { text: '…' }]).expect(200)).body);

    expect(answer.closed?.map(({ place }) => place.label)).toEqual(['302동식당']);
  });
});

describe('A question about a Restaurant its menu closes', () => {
  const ASKED = '2074-03-20';
  const QUOTED = `<data label="menu.line">${NOTICE}</data>`;

  beforeAll(() => dinnerAt(ASKED, { '302동식당': closedAllDay(NOTICE), '301동식당': [dish('dinner', '제육볶음')] }));

  it('answers its menu as closed, says 휴점 in the menu it shows, and brings it to the map', async () => {
    const findMenu = { tool: 'findMenu', input: { date: ASKED, meal: 'dinner', restaurant: '302동' } };

    const response = await stage.send([findMenu, { text: '…' }], {}, '302동 저녁 메뉴').expect(200);

    expect(stage.model.toolResults()[0]).toEqual({
      result: 'none',
      reason: `302동식당 is closed for dinner on ${ASKED}, as its menu's lines say: say so, with the reason they state.`,
      lines: [QUOTED],
    });
    const lookup = lookupIn(response.body);
    expect(lookup.menuView).toEqual({ restaurant: '302동식당', date: ASKED, meal: 'dinner', why: '오늘 휴점' });
    expect(lookup.scene.places.map(({ place }) => place.label)).toEqual(['302동식당']);
  });

  it('answers its hours as not serving with the closure, and brings it to the map', async () => {
    const hours = { tool: 'restaurantHours', input: { date: ASKED, restaurant: '302동', meal: 'dinner' } };

    const response = await stage.send([hours, { text: '…' }], {}, '302동 몇 시까지 해?').expect(200);

    expect(stage.model.toolResults()[0]).toMatchObject({
      result: 'found',
      meals: [
        { meal: 'lunch', serves: false, notes: [QUOTED] },
        { meal: 'dinner', serves: false, notes: [QUOTED] },
      ],
    });
    const lookup = lookupIn(response.body);
    expect(lookup.lines[1]).toEqual([{ text: '저녁은 안 해요', strong: false }]);
    expect(lookup.basis).toEqual([`점심: ${NOTICE}`, `저녁: ${NOTICE}`]);
    expect(lookup.scene.places.map(({ place }) => place.label)).toEqual(['302동식당']);
  });
});

describe('A question why a Restaurant is not among the places on screen', () => {
  const ASKED = '2074-03-27';
  const QUOTED = `<data label="menu.line">${NOTICE}</data>`;
  let context: object;

  beforeAll(async () => {
    await dinnerAt(ASKED, { '302동식당': closedAllDay(NOTICE), '301동식당': [dish('dinner', '제육볶음')] });
    context = { conditions: answerIn((await stage.send([planDinner(ASKED), { text: '…' }]).expect(200)).body).input };
  });

  it('answers a closed one with its notice in words, showing nothing of its own over the answer on screen', async () => {
    const response = await stage.send([why('302동'), { text: '…' }], { context }, '왜 302동은 없어?').expect(200);

    expect(stage.model.toolResults()[0]).toEqual({
      result: 'reason',
      restaurant: '302동식당',
      why: 'closed',
      notices: [QUOTED],
    });
    expect(replySchema.parse(response.body)).toEqual({ answer: null, lookup: null });
    expect(response.body).toMatchObject({ mapButtons: [], cards: [], proposal: null });
  });

  it('says one of the places is listed', async () => {
    await stage.send([why('301동'), { text: '…' }], { context }, '301동은 왜 없어?').expect(200);

    expect(stage.model.toolResults()[0]).toEqual({
      result: 'reason',
      restaurant: '301동식당',
      why: 'listed',
      words: '목록에 있어요',
    });
  });

  it('asks for the meal on screen when there is none', async () => {
    await stage.send([why('302동'), { text: '…' }], {}, '왜 302동은 없어?').expect(200);

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'none' });
  });
});
