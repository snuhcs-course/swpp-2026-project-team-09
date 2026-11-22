/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { onDay } from '../src/assistant/free-time/free-time.js';
import { type GatheringTravel } from '../src/assistant/gathering/gathering.js';
import { item, walks } from './gathering-fixtures.js';
import { HAND, meetingThenMeal, step, wayOf } from './own-way-fixtures.js';
import { classAt, id, placeOf, readCampus, seedTravel } from './way-example.js';

// An invited Friend's own way follows the Plan's shuttle (P05 ticket 41): their way straight to the gathering is by the
// shuttle of that day and hour when it is 3 minutes faster, and a Merging Point their own shuttle beats is left.

beforeAll(() => readCampus());

const MONDAY = '2026-11-23';
const SATURDAY = '2026-11-28';

// Lunch at 58동 from 12:00, the invitee's Class in 301동 ending at 11:00, asked the evening before.
function lunchAt58(date: string): ReturnType<typeof wayOf> {
  const steps = [step('SK경영관에서 식사', onDay(date, '12:00'), onDay(date, '12:40'), id('SK경영관'))];
  return wayOf(steps, [classAt(date, '10:00', '11:00', '제1공학관')], {
    travel: seedTravel(),
    placeOf,
    now: onDay('2026-11-22', '21:00'),
  });
}

describe('The way straight to the gathering', () => {
  it('goes by the Monday shuttle, with its stops, in the card and on the map', () => {
    const way = lunchAt58(MONDAY);

    expect(way).toMatchObject({
      walkMinutes: 13,
      leaveAt: '2026-11-23T11:47:00+09:00',
      arriveAt: '2026-11-23T12:00:00+09:00',
      mode: 'shuttle',
      shuttle: { boardAt: '301동', getOffAt: '경영대' },
    });
    expect(way.lines[0]?.map(({ text }) => text).join('')).toBe(
      '11:47에 나서면 돼요. 셔틀로 13분 (301동 정류장 → 경영대 정류장).',
    );
    expect(way.scene.routes.find(({ role }) => role === 'me')).toMatchObject({ minutes: 13, mode: 'shuttle' });
  });

  it('walks on a Saturday, when the shuttle does not run, and says nothing of it', () => {
    const way = lunchAt58(SATURDAY);

    expect(way).toMatchObject({ walkMinutes: 25, leaveAt: '2026-11-28T11:35:00+09:00' });
    expect(way).not.toHaveProperty('mode');
    expect(way.lines[0]?.map(({ text }) => text).join('')).toBe('11:35에 나서면 돼요. 걸어서 25분.');
  });
});

// O→M→P on foot is 1 + 10 minutes, O→P straight 10 on foot, or 3 by the shuttle.
const byShuttle = (from: string, to: string): boolean => from === 'O' && to === 'P';

function withShuttle(): GatheringTravel {
  const walking = walks(['O', 'M', 60], ['M', 'P', 600], ['O', 'P', 600]);
  return {
    walkingSeconds: walking.walkingSeconds,
    travel: (from, to) =>
      byShuttle(from, to)
        ? { seconds: 180, mode: 'shuttle' }
        : { seconds: walking.walkingSeconds(from, to), mode: 'walk' },
    shuttleWay: (from, to) =>
      byShuttle(from, to)
        ? {
            stops: [
              { order: 0, name: 'O앞', rideSeconds: 0 },
              { order: 1, name: 'P앞', rideSeconds: 60 },
            ],
            walkToStopSeconds: 60,
            waitSeconds: 0,
            walkFromStopSeconds: 60,
            ridesToBoarding: [0, 60],
            lapSeconds: 120,
          }
        : null,
  };
}

describe('The Merging Point', () => {
  it('is left for their own shuttle, which gets them there sooner', () => {
    const way = wayOf(meetingThenMeal(), [item('11:00', '11:50', 'O')], { ...HAND, travel: withShuttle() });

    expect(way).toMatchObject({ meeting: null, walkMinutes: 3, leaveAt: '2026-11-17T12:07:00+09:00', mode: 'shuttle' });
  });

  it('is kept on foot, as before, when their own way is on foot', () => {
    const travel = walks(['O', 'M', 60], ['M', 'P', 600], ['O', 'P', 600]);

    expect(wayOf(meetingThenMeal(), [item('11:00', '11:50', 'O')], { ...HAND, travel })).toMatchObject({
      meeting: { at: '2026-11-17T12:00:00+09:00' },
      walkMinutes: 11,
    });
  });
});
