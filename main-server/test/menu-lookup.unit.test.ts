/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { dishesOf, menuAnswer } from '../src/assistant/lookup/menu-lookup.js';
import { MenuLineKind } from '../src/generated/prisma/client.js';
import { type Cuisines } from '../src/menus/cuisine-words.js';
import { type MenuLineDto } from '../src/menus/dto/restaurant-menus.dto.js';
import { answerOf, ME, person, plain, point, position, strong, time } from './meal-answers.js';
import { at, classAt, DATE, id, readWorld } from './worked-example.js';

// A Restaurant's menu drawn on the map (board q8): "오늘 301동식당 메뉴 뭐야?" on Tuesday 2026-11-17 at 11:40, in a
// Class in 301동 until 11:50 with the next at 13:00 in 24동, on the seed's walking table and the menus collected on
// 2026-10-01.

beforeAll(() => readWorld());

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

// The lunch lines of that Restaurant as the Co-op wrote them on 2026-10-01.
function lunchOf(name: string): MenuLineDto[] {
  const found = restaurants.find((restaurant) => restaurant.name === name);
  if (found === undefined) {
    throw new Error(`No menus of ${name}`);
  }
  return found.lines
    .filter(({ meal }) => meal === 'lunch')
    .map(({ text, kind, name: dish, price }) => ({
      text,
      kind,
      name: dish,
      price,
    }));
}

const NOW = at('11:40');

// The hours RestaurantHours keeps for the meal, as the menu service gives them.
const HOURS = { opensAt: '11:30', closesAt: '13:30' };

// The User's Lookup of a Restaurant's lunch at its Place, alone, with their day as given.
function lookupOf(key: string, placeName: string, items: DayItem[], cuisines?: Cuisines): Lookup {
  const answer = answerOf([person(ME, '유상', items)], {
    candidates: [{ key, placeId: id(placeName) }],
    now: NOW,
    fixed: { placeId: id(placeName) },
  });
  const found = menuAnswer({
    key,
    date: DATE,
    meal: 'lunch',
    now: NOW,
    lines: lunchOf(key),
    answer,
    hours: HOURS,
    ...(cuisines === undefined ? {} : { cuisines }),
  });
  if (found.result !== 'found') {
    throw new Error(`No menu Lookup: ${found.result}`);
  }
  return found.lookup;
}

const boardDay = (): DayItem[] => [classAt('11:00', '11:50', '제1공학관'), classAt('13:00', '13:50', '자연과학관6')];

const boardQ8 = (): Lookup => lookupOf('301동식당', '제1공학관', boardDay());

describe('301동식당 at 11:40, in a Class there until 11:50 (board q8)', () => {
  it('is a menu, with where the User sets out from and their next Class as its chips', () => {
    expect(boardQ8()).toMatchObject({
      kind: 'menu',
      chips: [
        { kind: 'origin', text: '301동에서', userId: null },
        { kind: 'until', text: '13:00 수업까지', userId: null },
      ],
    });
  });

  it('names the Restaurant, the first dish of its main line with its price and how many more, then how long the User can eat', () => {
    expect(boardQ8().lines).toEqual([
      [strong('301동식당'), plain(' 오늘 점심은 부대짬뽕&군만두 6,500원 외 1')],
      [plain('12:45까지 55분 먹을 수 있어요')],
    ]);
  });
});

describe('301동식당 at 11:40 on the map (board q8)', () => {
  it('bands the meal from 11:50 to 12:45, between the Classes', () => {
    expect(boardQ8().band).toEqual({
      range: { startAt: time('11:30'), endAt: time('13:30') },
      now: time('11:40'),
      lanes: [
        {
          userId: ME,
          name: '나',
          busy: [
            { startAt: time('11:30'), endAt: time('11:50'), label: '301동 수업' },
            { startAt: time('13:00'), endAt: time('13:30'), label: '24동 수업' },
          ],
        },
      ],
      startAt: time('11:50'),
      endAt: time('12:45'),
      text: '11:50–12:45 · 식사 55분',
    });
  });

  it("draws the Restaurant as the pick with its main line's dishes, and the way on to 24동", () => {
    expect(boardQ8().scene).toEqual({
      people: [{ userId: ME, name: '유상', me: true, at: position('제1공학관'), source: 'timetable', tag: '나' }],
      places: [
        { place: point('제1공학관', '301동식당'), role: 'pick', tag: '301동식당' },
        { place: point('자연과학관6', '24동'), role: 'next', tag: '13:00 수업 · 24동' },
      ],
      routes: [{ userId: ME, role: 'next', from: position('제1공학관'), to: position('자연과학관6'), minutes: 15 }],
      flags: [{ at: position('제1공학관'), text: '부대짬뽕&군만두 · (뚝)순댓국&계란장조림', role: 'place' }],
    });
  });

  it('rests on the dishes with their prices and the walk on to the next Class, and guides the User there', () => {
    expect(boardQ8()).toMatchObject({
      basis: ['부대짬뽕&군만두 6,500원 · (뚝)순댓국&계란장조림 6,500원', '24동까지 걸어서 15분이라 12:45에 나서요'],
      actions: [{ kind: 'guide', to: point('제1공학관', '301동식당') }],
    });
  });
});

// P04 ticket 60: asked the day before, the label and the first line name the day, as the meal Plan's time bar does.
describe('301동식당 asked the day before', () => {
  it('names the day before the meal and the dishes', () => {
    const answer = answerOf([person(ME, '유상', boardDay())], {
      candidates: [{ key: '301동식당', placeId: id('제1공학관') }],
      now: NOW,
      fixed: { placeId: id('제1공학관') },
    });
    const dayBefore = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);

    const found = menuAnswer({
      key: '301동식당',
      date: DATE,
      meal: 'lunch',
      now: dayBefore,
      lines: lunchOf('301동식당'),
      answer,
      hours: HOURS,
    });

    expect(found.result === 'found' && found.lookup.scene.flags).toEqual([
      { at: position('제1공학관'), text: '내일(화) 점심 · 부대짬뽕&군만두 · (뚝)순댓국&계란장조림', role: 'place' },
    ]);
    expect(found.result === 'found' && found.lookup.lines[0]).toEqual([
      strong('301동식당'),
      plain(' 내일(화) 점심은 부대짬뽕&군만두 6,500원 외 1'),
    ]);
  });
});

describe('The time to eat', () => {
  it('starts when the User can be there, after the walk, and ends when they must leave for their next Class', () => {
    const lookup = lookupOf('학생회관식당', '학생회관', boardDay());

    expect(lookup.band).toMatchObject({ startAt: time('12:05'), endAt: time('12:59') });
    expect(lookup.lines[1]).toEqual([plain('12:59까지 54분 먹을 수 있어요')]);
    expect(lookup.basis).toEqual([
      '눈꽃치즈닭갈비 6,000원 · 단호박영양밥&양념장(#) 3,000원 · 수제탕수육 6,000원',
      '301동 → 학생회관식당 걸어서 15분',
      '24동까지 걸어서 1분이라 12:59에 나서요',
    ]);
  });

  it('says the shuttle where the way there is by it, a Restaurant at 58동 being 25 minutes on foot', () => {
    const { basis } = lookupOf('학생회관식당', 'SK경영관', boardDay());

    expect(basis).toContainEqual(
      expect.stringMatching(/^301동 → 학생회관식당 셔틀로 \d+분 \(301동 정류장 → 경영대 정류장\)$/u),
    );
  });

  it('ends an hour after it starts when nothing follows: the closing at 14:30 is when 301동식당 last serves', () => {
    const lookup = lookupOf('301동식당', '제1공학관', [classAt('11:00', '11:50', '제1공학관')]);

    expect(lookup.band).toMatchObject({ startAt: time('11:50'), endAt: time('12:50') });
    expect(lookup.lines[1]).toEqual([plain('12:50까지 60분 먹을 수 있어요')]);
    expect(lookup.basis).toEqual([
      '부대짬뽕&군만두 6,500원 · (뚝)순댓국&계란장조림 6,500원',
      '식사는 한 시간으로 잡았어요',
    ]);
    expect(lookup.chips).toEqual([{ kind: 'origin', text: '301동에서', userId: null }]);
  });

  it("ends when the next Class starts when that Class is in the Restaurant's building, with no walk on to name", () => {
    const lookup = lookupOf('301동식당', '제1공학관', [
      classAt('11:00', '11:50', '제1공학관'),
      classAt('12:30', '13:20', '제1공학관'),
    ]);

    expect(lookup.band).toMatchObject({ startAt: time('11:50'), endAt: time('12:30') });
    expect(lookup.basis).toEqual(['부대짬뽕&군만두 6,500원 · (뚝)순댓국&계란장조림 6,500원', '12:30에 나서요']);
  });
});

describe('No time to eat', () => {
  it('is none when no break during the meal leaves the User time to be there and eat', () => {
    const items = [
      classAt('11:00', '12:15', '제1공학관'),
      classAt('12:30', '13:45', '자연과학관6'),
      classAt('14:00', '15:15', '자연과학관6'),
    ];
    const answer = answerOf([person(ME, '유상', items)], {
      candidates: [{ key: '301동식당', placeId: id('제1공학관') }],
      now: NOW,
      fixed: { placeId: id('제1공학관') },
    });

    expect(
      menuAnswer({
        key: '301동식당',
        date: DATE,
        meal: 'lunch',
        now: NOW,
        lines: lunchOf('301동식당'),
        answer,
        hours: null,
      }),
    ).toEqual({ result: 'none', reason: 'no-time' });
  });
});

// The map's card of the Restaurant (P04 ticket 08) reads the menu's facts from the Lookup, not from its words.
describe("A menu Lookup's facts", () => {
  it("are the meal's hours and the dishes of its main corner with their prices", () => {
    expect(boardQ8().menu).toEqual({
      hours: HOURS,
      dishes: [
        { name: '부대짬뽕&군만두', price: 6500, cuisine: null },
        { name: '(뚝)순댓국&계란장조림', price: 6500, cuisine: null },
      ],
    });
  });

  it('give each dish its kept kind of food, none to a dish not read', () => {
    const cuisines = new Map([['부대짬뽕&군만두', '중식' as const]]);

    expect(lookupOf('301동식당', '제1공학관', boardDay(), cuisines).menu?.dishes.map(({ cuisine }) => cuisine)).toEqual(
      ['중식', null],
    );
  });
});

describe("The main line's dishes", () => {
  it('are the dishes under the first heading, without their prices, leaving the other corners and the notes out', () => {
    expect(dishesOf(lunchOf('301동식당'))).toEqual(['부대짬뽕&군만두', '(뚝)순댓국&계란장조림']);
  });

  it('are the lines before the first heading, when the cell starts with dishes', () => {
    expect(dishesOf(lunchOf('3식당'))).toEqual(['치즈한장부대찌개', '오므라이스&육즙함박']);
  });

  it('are the lines listed under a heading with a set price, at most three', () => {
    expect(dishesOf(lunchOf('302동식당'))).toEqual(['뼈없는감자탕', '미트볼굴소스조림', '참깨소스냉두부']);
  });
});

// P05 ticket 47: a menu only tells a fact, so the dock shows no main button; the way stays for the Restaurant's card.
it('is a fact, keeping its way among the actions', () => {
  expect(boardQ8()).toMatchObject({ fact: true, actions: [{ kind: 'guide' }] });
});
