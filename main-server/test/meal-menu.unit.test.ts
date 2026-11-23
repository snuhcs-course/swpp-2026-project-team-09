/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { type AnswerLine } from '../src/assistant/dto/answer.dto.js';
import { mainMenu, menuBasis, menuLine, withMenu } from '../src/assistant/gathering/meal-menu.js';
import { dishesOf } from '../src/assistant/lookup/menu-lookup.js';
import { MenuLineKind } from '../src/generated/prisma/client.js';
import { type MenuLineDto } from '../src/menus/dto/restaurant-menus.dto.js';
import { firstPlan, answerOf, me, minsu, jieun, plain, strong } from './meal-answers.js';
import { readWorld } from './worked-example.js';

// What a meal Plan says of its Restaurant's menu, on the menus collected on 2026-10-01, asked on Tuesday 2026-11-17 at
// 11:50 (the worked example).

beforeAll(() => readWorld());

const NOW = new Date('2026-11-17T11:50:00+09:00');
const TODAY = '2026-11-17';

const fixtureSchema = z.object({
  restaurants: z.array(
    z.object({
      name: z.string(),
      lines: z.array(
        z.object({
          meal: z.string(),
          text: z.string(),
          kind: z.enum(MenuLineKind).nullable(),
          name: z.string().nullable(),
          price: z.number().nullable(),
        }),
      ),
    }),
  ),
});

const { restaurants } = fixtureSchema.parse(
  JSON.parse(readFileSync(new URL('menu-lines-2026-10-01.json', import.meta.url), 'utf8')),
);

function lunchOf(name: string): MenuLineDto[] {
  const found = restaurants.find((each) => each.name === name);
  if (found === undefined) {
    throw new Error(`No ${name} in the stored lines`);
  }
  return found.lines.filter(({ meal }) => meal === 'lunch').map(({ meal: _meal, ...line }) => line);
}

const lineOf = (name: string, closesAt: string | null = null, date = TODAY): AnswerLine | null =>
  menuLine({ lines: lunchOf(name), closesAt }, date, NOW);

describe("A meal Plan's menu line", () => {
  it('names the first dish without its price, how many more there are, and when serving ends', () => {
    expect(lineOf('학생회관식당', '14:30')).toEqual([
      plain('오늘 '),
      strong('눈꽃치즈닭갈비'),
      plain(' 외 2 · 14:30까지 배식'),
    ]);
  });

  it('ends at the dish when the hours were never read', () => {
    expect(lineOf('학생회관식당')).toEqual([plain('오늘 '), strong('눈꽃치즈닭갈비'), plain(' 외 2')]);
  });

  it("names a buffet's first dish and counts the others", () => {
    expect(lineOf('302동식당', '13:30')).toEqual([
      plain('오늘 '),
      strong('뼈없는감자탕'),
      plain(' 외 5 · 13:30까지 배식'),
    ]);
  });

  it('leaves plain rice out, and counts the order menu under the buffet', () => {
    expect(lineOf('두레미담')).toEqual([plain('오늘 '), strong('뼈없는감자탕'), plain(' 외 18')]);
  });

  it("drops a corner's tag and keeps a set's first dish", () => {
    expect(lineOf('예술계식당')).toEqual([plain('오늘 '), strong('제육김치덮밥'), plain(' 외 2')]);
  });

  it('names a menu written without kinds by its line', () => {
    expect(lineOf('수의대식당')).toEqual([plain('오늘 '), strong('카레라이스')]);
  });

  it('names the day for tomorrow and a later day', () => {
    expect(lineOf('수의대식당', null, '2026-11-18')?.[0]).toEqual(plain('내일 '));
    expect(lineOf('수의대식당', null, '2026-11-20')?.[0]).toEqual(plain('11월 20일 '));
  });

  it('is none for a cell of notes only', () => {
    const notes: MenuLineDto[] = [
      { text: '※ 운영시간 : 11:00~14:30', kind: MenuLineKind.note, name: null, price: null },
    ];
    expect(menuLine({ lines: notes, closesAt: '14:30' }, TODAY, NOW)).toBeNull();
    expect(menuBasis({ lines: notes, closesAt: '14:30' })).toEqual([]);
  });
});

describe("A meal Plan's menu in 근거", () => {
  it('lists the dishes with their prices, then where the menu and the serving end come from', () => {
    expect(menuBasis({ lines: lunchOf('학생회관식당'), closesAt: '14:30' })).toEqual([
      '눈꽃치즈닭갈비 6,000원 · 단호박영양밥&양념장(#) 3,000원 · 수제탕수육 6,000원',
      '메뉴와 배식 시각: 오늘의 식단',
    ]);
  });

  it('gives each corner its own line under its heading, without the notice the page cut in two', () => {
    expect(menuBasis({ lines: lunchOf('자하연식당 3층'), closesAt: null })).toEqual([
      '동태매운탕(#) 13,000원 · 세가지치즈를품은쇠고기함박 15,000원',
      '세미뷔페: 오징어다시마숙회 · 단호박튀김 · 그린샐러드 · 팽이미소국 · 후식',
      '메뉴: 오늘의 식단',
    ]);
  });

  it("writes a buffet's price with its heading", () => {
    expect(menuBasis({ lines: lunchOf('301동식당'), closesAt: null })).toEqual([
      '식사: 부대짬뽕&군만두 6,500원 · (뚝)순댓국&계란장조림 6,500원',
      'TAKE-OUT: 베이컨감자샐러드 5,500원 · 헬스팩 6,000원',
      '301동1층 교직원전용식당: 육개장칼국수&메밀전병 9,000원',
      '메뉴: 오늘의 식단',
    ]);
    expect(menuBasis({ lines: lunchOf('302동식당'), closesAt: null })[0]).toBe(
      '뷔페 6,500원: 뼈없는감자탕 · 미트볼굴소스조림 · 참깨소스냉두부 · 치커리유자청무침 · 오렌지 · 그린샐러드&오늘의차',
    );
  });
});

describe('The main dish', () => {
  it("is the one the building's card and the menu Lookup name first", () => {
    expect(dishesOf(lunchOf('두레미담'))).toEqual(['뼈없는감자탕', '영양부추간장불고기', '치킨까스*소스']);
    expect(dishesOf(lunchOf('예술계식당'))[0]).toBe('제육김치덮밥, 잡채, 떡꼬치구이');
  });
});

describe("The menu line among a Plan's lines", () => {
  const served = { lines: lunchOf('302동식당'), closesAt: '13:30' };
  const at = { key: '302동식당', date: TODAY, now: NOW };
  const named: AnswerLine = [plain('점심 '), strong('302동식당'), plain(' · 식사 50분')];
  const other: AnswerLine = [plain('위치를 몰라 직전 수업의')];
  const leave: AnswerLine = [plain('12:43엔 나서야 해요')];
  const menu = [plain('오늘 '), strong('뼈없는감자탕'), plain(' 외 5 · 13:30까지 배식')];

  it('comes right after a first line that names the Restaurant, else last', () => {
    expect(withMenu([named, leave], served, at)).toEqual([named, menu, leave]);
    expect(withMenu([other, leave], served, at)).toEqual([other, leave, menu]);
    expect(withMenu([named], undefined, at)).toEqual([named]);
  });

  it('leaves the serving end out when a line already says when the Restaurant stops serving, not when another one does', () => {
    const closes: AnswerLine = [plain('302동식당은 13:30에 배식이 끝나요')];
    expect(withMenu([named, closes], served, at)[1]).toEqual([plain('오늘 '), strong('뼈없는감자탕'), plain(' 외 5')]);
    const another: AnswerLine = [plain('학생회관식당은 14:00에 배식이 끝나요')];
    expect(withMenu([named, another], served, at)).toEqual([named, menu, another]);
  });

  it('stands in the Plans alone and with Friends, with the whole menu at the end of 근거', () => {
    const lines = lunchOf('학생회관식당');
    const menus = new Map([['학생회관식당', { lines, closesAt: '14:30' }]]);
    const alone = answerOf([me()], { served: menus }).plans.find(({ id }) => id === '학생회관식당');
    expect(alone?.lines.map((line) => line.map(({ text }) => text).join(''))).toEqual([
      '점심 학생회관식당 · 식사 54분',
      '오늘 눈꽃치즈닭갈비 외 2 · 14:30까지 배식',
      '15분을 걷고 12:59엔 나서야 해요',
    ]);
    expect(alone?.basis.slice(-2)).toEqual([
      '눈꽃치즈닭갈비 6,000원 · 단호박영양밥&양념장(#) 3,000원 · 수제탕수육 6,000원',
      '메뉴와 배식 시각: 오늘의 식단',
    ]);
    const together = firstPlan(answerOf([me(), minsu(), jieun()], { aloneMinutes: 55, served: menus }));
    expect(together.id).toBe('학생회관식당');
    expect(together.lines[1]).toEqual([plain('오늘 '), strong('눈꽃치즈닭갈비'), plain(' 외 2 · 14:30까지 배식')]);
  });
});

describe("A meal Plan's menu", () => {
  it("is its Restaurant's main corner, its dishes with their prices in the menu's order, and absent without one", () => {
    const menus = new Map([['학생회관식당', { lines: lunchOf('학생회관식당'), closesAt: '14:30' }]]);
    const { plans } = answerOf([me()], { served: menus });

    expect(plans.find(({ id }) => id === '학생회관식당')?.menu).toEqual({
      price: null,
      dishes: [
        { name: '눈꽃치즈닭갈비', price: 6000, cuisine: null },
        { name: '단호박영양밥&양념장(#)', price: 3000, cuisine: null },
        { name: '수제탕수육', price: 6000, cuisine: null },
      ],
    });
    expect(plans.filter(({ id }) => id !== '학생회관식당').map(({ menu }) => menu)).not.toContainEqual(
      expect.anything(),
    );
  });

  it("leaves the other corners out, and gives a buffet's price once, from its heading", () => {
    const self = mainMenu(lunchOf('두레미담'));
    expect(self.price).toBe(7000);
    expect(self.dishes.map(({ name }) => name)).toEqual([
      '뼈없는감자탕',
      '영양부추간장불고기',
      '치킨까스*소스',
      '버터치킨크림카레',
      '마늘쫑무침',
      '깍두기',
      '그린샐러드',
      '오늘의차',
    ]);
    expect(mainMenu(lunchOf('302동식당'))).toMatchObject({
      price: 6500,
      dishes: expect.arrayContaining([{ name: '뼈없는감자탕', price: null, cuisine: null }]) as unknown,
    });
  });

  it('gives each dish its kept kind of food, and none to a dish not read', () => {
    const cuisines = new Map([['부대짬뽕&군만두', '중식' as const]]);

    expect(mainMenu(lunchOf('301동식당'), cuisines).dishes).toEqual([
      { name: '부대짬뽕&군만두', price: 6500, cuisine: '중식' },
      { name: '(뚝)순댓국&계란장조림', price: 6500, cuisine: null },
    ]);
  });
});
