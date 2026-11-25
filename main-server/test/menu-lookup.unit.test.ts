/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { type AnswerReply, type Plan } from '../src/assistant/dto/answer.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { dishesOf, menuAnswer } from '../src/assistant/lookup/menu-lookup.js';
import { MenuLineKind } from '../src/generated/prisma/client.js';
import { type MenuLineDto } from '../src/menus/dto/restaurant-menus.dto.js';
import { answerOf, ME, person, time } from './meal-answers.js';
import { at, classAt, DATE, id, readWorld } from './worked-example.js';

// A menu question's answer (P04 ticket 72): "오늘 301동식당 메뉴 뭐야?" on Tuesday 2026-11-17 at 11:40, in a Class in
// 301동 until 11:50 with the next at 13:00 in 24동, on the seed's walking table and the menus collected on 2026-10-01.
// It is the meal's answer for the User alone, as planMeal plans it, opened at the Restaurant when that is one of its
// Plans, which the app shows as a place opened from the list.

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

interface Opened {
  answer: AnswerReply;
  plan: Plan;
}

// The meal answer of the User's lunch alone, with their day as given, the Restaurant at that Place among its
// candidates, opened at it.
function openedAt(key: string, placeName: string, items: DayItem[]): Opened {
  const answer = answerOf([person(ME, '유상', items)], { candidates: [{ key, placeId: id(placeName) }], now: NOW });
  const found = menuAnswer({ key, date: DATE, meal: 'lunch', now: NOW, lines: lunchOf(key), answer });
  if (found.result !== 'found') {
    throw new Error(`No meal Plan at ${key}: ${found.result}`);
  }
  return found;
}

const boardDay = (): DayItem[] => [classAt('11:00', '11:50', '제1공학관'), classAt('13:00', '13:50', '자연과학관6')];

// Partitions: the Restaurant's Plan found; its time to eat between Classes, by the shuttle, with nothing after, with
// the next Class in its building; no time to eat. Expected values: the worked example's walks and the Classes' times.
describe('A menu asked of 301동식당 at 11:40, in a Class there until 11:50 (board q8)', () => {
  it("is the meal answer opened at 301동식당, whose Plan is the Restaurant's", () => {
    const { answer, plan } = openedAt('301동식당', '제1공학관', boardDay());

    expect(answer.opened).toBe('301동식당');
    expect(plan.id).toBe('301동식당');
    expect(answer.plans).toContain(plan);
    expect(answer.input).toMatchObject({ kind: 'meal', meal: 'lunch', placeId: null });
  });

  it('is the whole meal: every Restaurant the User can eat at is one of its Plans, as planMeal answers', () => {
    const answer = answerOf([person(ME, '유상', boardDay())], { now: NOW });

    const found = menuAnswer({
      key: '301동식당',
      date: DATE,
      meal: 'lunch',
      now: NOW,
      lines: lunchOf('301동식당'),
      answer,
    });

    expect(found).toMatchObject({ result: 'found', answer: { opened: '301동식당' } });
    expect(answer.plans.length).toBeGreaterThan(1);
  });
});

describe('The time to eat', () => {
  it('starts when the User can be there, after the walk, and ends when they must leave for their next Class', () => {
    const { plan } = openedAt('학생회관식당', '학생회관', boardDay());

    expect(plan.band).toMatchObject({ startAt: time('12:05'), endAt: time('12:59') });
    expect(plan.togetherMinutes).toBe(54);
  });

  it('goes by the shuttle where the way there is by it, a Restaurant at 58동 being 25 minutes on foot', () => {
    const { plan } = openedAt('학생회관식당', 'SK경영관', boardDay());

    expect(plan.parts[0]?.mode).toBe('shuttle');
  });

  it('ends an hour after it starts when nothing follows: the closing at 14:30 is when 301동식당 last serves', () => {
    const { plan } = openedAt('301동식당', '제1공학관', [classAt('11:00', '11:50', '제1공학관')]);

    expect(plan.band).toMatchObject({ startAt: time('11:50'), endAt: time('12:50') });
    expect(plan.togetherMinutes).toBe(60);
  });

  it("ends when the next Class starts when that Class is in the Restaurant's building", () => {
    const { plan } = openedAt('301동식당', '제1공학관', [
      classAt('11:00', '11:50', '제1공학관'),
      classAt('12:30', '13:20', '제1공학관'),
    ]);

    expect(plan.band).toMatchObject({ startAt: time('11:50'), endAt: time('12:30') });
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
    });

    expect(
      menuAnswer({ key: '301동식당', date: DATE, meal: 'lunch', now: NOW, lines: lunchOf('301동식당'), answer }),
    ).toEqual({ result: 'none', reason: 'no-time' });
  });
});

describe('A Restaurant none of whose Plans the meal has', () => {
  it('is none while the meal has Plans at other Restaurants', () => {
    const answer = answerOf([person(ME, '유상', boardDay())], {
      candidates: [{ key: '학생회관식당', placeId: id('학생회관') }],
      now: NOW,
    });

    expect(answer.plans.map(({ id: planId }) => planId)).toEqual(['학생회관식당']);
    expect(
      menuAnswer({ key: '301동식당', date: DATE, meal: 'lunch', now: NOW, lines: lunchOf('301동식당'), answer }),
    ).toEqual({ result: 'none', reason: 'no-time' });
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
