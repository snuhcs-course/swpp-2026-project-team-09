/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../src/common/geometry.js';
import { SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { type CardStep, gatheringOf } from '../src/plans/own-way.js';
import { readSeedTravel, type SeedTravel } from '../src/travel/travel.js';
import { step, wayOf } from './own-way-fixtures.js';
import { at, id, jieunDay, minsuDay, NOW, placeOf, readWorld } from './worked-example.js';

// The invitee's own way in the design's worked example (section 6.1), on the seed's walking table: the Leader's Quest
// meets at 301동 at 12:18 and eats at the Student Center from 12:33.

let travel: SeedTravel;

beforeAll(async () => {
  await readWorld();
  travel = await readSeedTravel(SEED_DIRECTORY);
});

const lunchSteps = (): CardStep[] => [
  step('유상, 민수: 301동 앞에서 만나기', at('12:18'), at('12:33'), id('제1공학관')),
  step('학생회관식당에서 식사', at('12:33'), at('12:55'), id('학생회관')),
];

const pointOf = (name: string, label: string): object => {
  const { latitude, longitude } = placeOf(id(name));
  return { placeId: id(name), label, latitude, longitude };
};

const positionOf = (name: string): Position => {
  const { latitude, longitude } = placeOf(id(name));
  return { latitude, longitude };
};

const minsuWay = (): ReturnType<typeof wayOf> => wayOf(lunchSteps(), minsuDay(), { travel, placeOf, now: NOW });

const jieunWay = (): ReturnType<typeof wayOf> =>
  wayOf(lunchSteps(), jieunDay(), { travel, placeOf, now: NOW, invitee: { id: 'invitee', name: '지은' } });

describe('The lunch Quest', () => {
  it('gathers at the meal, with the meeting before it', () => {
    expect(gatheringOf(lunchSteps(), travel)).toMatchObject({
      destination: { title: '학생회관식당에서 식사' },
      meeting: { title: '유상, 민수: 301동 앞에서 만나기' },
    });
  });
});

describe("민수's way", () => {
  it('goes through 301동, setting out as his Class in 302동 ends', () => {
    expect(minsuWay()).toMatchObject({
      status: 'ok',
      origin: { place: pointOf('제2공학관', '302동'), basis: 'timetable' },
      leaveAt: '2026-11-17T12:15:00+09:00',
      walkMinutes: 18,
      arriveAt: '2026-11-17T12:33:00+09:00',
      meeting: { place: pointOf('제1공학관', '301동'), at: '2026-11-17T12:18:00+09:00' },
      leaveBy: null,
      next: null,
    });
  });

  it('is told in one line', () => {
    expect(minsuWay().lines).toEqual([
      [
        { text: '12:15에 수업이 끝나면 바로 나서면 돼요.', strong: true },
        { text: ' 걸어서 18분.', strong: false },
      ],
    ]);
  });

  it('draws him alone at 302동, the meal, and the Merging Point', () => {
    expect(minsuWay().scene).toMatchObject({
      people: [{ userId: 'invitee', name: '민수', me: true, at: positionOf('제2공학관'), source: 'timetable' }],
      places: [
        { place: pointOf('학생회관', '63동'), role: 'pick', tag: null },
        { place: pointOf('제1공학관', '301동'), role: 'meeting', tag: null },
      ],
    });
    expect(minsuWay().scene.people[0]?.tag).toBe('나 · 18분');
  });

  it('draws his two legs and the two flags', () => {
    const { routes, flags } = minsuWay().scene;

    expect(routes).toEqual([
      { userId: 'invitee', role: 'me', from: positionOf('제2공학관'), to: positionOf('제1공학관'), minutes: 3 },
      { userId: 'invitee', role: 'me', from: positionOf('제1공학관'), to: positionOf('학생회관'), minutes: 15 },
    ]);
    expect(flags).toEqual([
      { at: positionOf('학생회관'), text: '12:33 학생회관식당에서 식사', role: 'place' },
      { at: positionOf('제1공학관'), text: '12:18 유상과 만남', role: 'meeting' },
    ]);
  });
});

describe("지은's way", () => {
  it('goes straight, 5 minutes, and out again for her 13:00 Class', () => {
    expect(jieunWay()).toMatchObject({
      origin: { place: pointOf('두산인문관', '8동'), basis: 'timetable' },
      leaveAt: '2026-11-17T12:28:00+09:00',
      walkMinutes: 5,
      arriveAt: '2026-11-17T12:33:00+09:00',
      meeting: null,
      leaveBy: '2026-11-17T12:55:00+09:00',
      next: { startAt: '2026-11-17T13:00:00+09:00', place: pointOf('두산인문관', '8동') },
      lines: [
        [
          { text: '12:28에 나서면 돼요.', strong: true },
          { text: ' 걸어서 5분.', strong: false },
        ],
        [{ text: '13:00 수업이라 12:55엔 나서요.', strong: false }],
      ],
    });
  });

  it('draws her Class after, her way there and back, and the meal flag alone', () => {
    const { places, routes, flags } = jieunWay().scene;

    expect(places).toEqual([
      { place: pointOf('학생회관', '63동'), role: 'pick', tag: null },
      { place: pointOf('두산인문관', '8동'), role: 'next', tag: '13:00 수업 · 8동' },
    ]);
    expect(routes).toEqual([
      { userId: 'invitee', role: 'me', from: positionOf('두산인문관'), to: positionOf('학생회관'), minutes: 5 },
      { userId: 'invitee', role: 'next', from: positionOf('학생회관'), to: positionOf('두산인문관'), minutes: 5 },
    ]);
    expect(flags).toEqual([{ at: positionOf('학생회관'), text: '12:33 학생회관식당에서 식사', role: 'place' }]);
  });
});

describe('민수 at 302동식당', () => {
  it('walks nowhere, in the building of his Class', () => {
    const steps = [step('302동식당에서 식사', at('12:15'), at('12:43'), id('제2공학관'))];

    expect(wayOf(steps, minsuDay(), { travel, placeOf, now: NOW })).toMatchObject({
      status: 'ok',
      leaveAt: '2026-11-17T12:15:00+09:00',
      walkMinutes: 0,
      arriveAt: '2026-11-17T12:15:00+09:00',
      meeting: null,
      lines: [[{ text: '같은 건물이라 걷지 않아도 돼요.', strong: false }]],
      scene: { people: [{ tag: '나' }], routes: [] },
    });
  });
});
