/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { type CardStep } from '../src/plans/own-way.js';
import { readSeedTravel, type SeedTravel } from '../src/travel/travel.js';
import { step, wayOf } from './own-way-fixtures.js';
import { at, id, jieunDay, minsuDay, NOW, placeOf, readWorld } from './worked-example.js';

// A late Holder's own way in the design's worked example (sections 5 and 6.1), on the seed's walking table: they set
// out the minutes later than their way on time has them set out. The Quest meets at 301동 at 12:18 and eats at the
// Student Center from 12:33.

let travel: SeedTravel;

beforeAll(async () => {
  await readWorld();
  travel = await readSeedTravel(SEED_DIRECTORY);
});

const lunchSteps = (): CardStep[] => [
  step('유상, 민수: 301동 앞에서 만나기', at('12:18'), at('12:33'), id('제1공학관')),
  step('학생회관식당에서 식사', at('12:33'), at('12:55'), id('학생회관')),
];

const minsuLate = (lateMinutes: number): ReturnType<typeof wayOf> =>
  wayOf(lunchSteps(), minsuDay(), { travel, placeOf, now: NOW, lateMinutes });

describe('민수, whose way on time sets out at 12:15 through 301동', () => {
  it('5 minutes late, sets out at 12:20, goes straight, 17 minutes, and arrives at 12:37', () => {
    expect(minsuLate(5)).toMatchObject({
      status: 'ok',
      leaveAt: '2026-11-17T12:20:00+09:00',
      walkMinutes: 17,
      arriveAt: '2026-11-17T12:37:00+09:00',
      meeting: null,
      lines: [
        [
          { text: '12:37에야 도착해요.', strong: true },
          { text: ' 걸어서 17분.', strong: false },
        ],
      ],
    });
  });

  it('15 minutes late, arrives at 12:47', () => {
    expect(minsuLate(15)).toMatchObject({
      leaveAt: '2026-11-17T12:30:00+09:00',
      walkMinutes: 17,
      arriveAt: '2026-11-17T12:47:00+09:00',
      meeting: null,
    });
  });

  it('1 minute late, no longer reaches the Merging Point by its start, and going straight is still in time', () => {
    expect(minsuLate(1)).toMatchObject({
      leaveAt: '2026-11-17T12:16:00+09:00',
      walkMinutes: 17,
      arriveAt: '2026-11-17T12:33:00+09:00',
      meeting: null,
    });
  });
});

describe('지은, who would set out at 12:28 for a 5-minute walk', () => {
  it('5 minutes late, sets out at 12:33 and arrives at 12:38', () => {
    expect(
      wayOf(lunchSteps(), jieunDay(), {
        travel,
        placeOf,
        now: NOW,
        lateMinutes: 5,
        invitee: { id: 'j', name: '지은' },
      }),
    ).toMatchObject({
      leaveAt: '2026-11-17T12:33:00+09:00',
      walkMinutes: 5,
      arriveAt: '2026-11-17T12:38:00+09:00',
      meeting: null,
      leaveBy: '2026-11-17T12:55:00+09:00',
    });
  });
});

describe('A late Holder whose origin is unknown', () => {
  it('has a way as it is, with no arrival', () => {
    expect(wayOf(lunchSteps(), [], { travel, placeOf, now: NOW, lateMinutes: 5 })).toMatchObject({
      status: 'unknown',
      origin: null,
      leaveAt: null,
      walkMinutes: null,
      arriveAt: null,
      lines: [],
    });
  });
});
