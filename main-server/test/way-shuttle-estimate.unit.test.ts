/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type WayArgs } from '../src/assistant/lookup/way.js';
import { type ShuttleWay } from '../src/travel/travel.js';
import { classAt, id, ME, position, readCampus, reporting, stopPosition, TUESDAY, wayFor } from './way-example.js';

// The shuttle weighed against the walk, from 301동 to 58동 on Tuesday at 10:00, with timings chosen by hand: 2 minutes
// to the 301동 stop, an average wait of 3 minutes, a ride of 7 minutes, and 1 minute from the stop, 13 minutes in
// all with the average wait. A shuttle at 신소재공동연구소 is 5 minutes from the 301동 stop, one at 302동 1 minute,
// one at 농생대 10 minutes, and one at 유전공학연구소, the stop after it, 17 minutes; a lap of the loop is 20
// minutes.

beforeAll(() => readCampus());

const NOW = onDay(TUESDAY, '10:00');
const SECONDS = { toStop: 120, wait: 180, ride: 420, fromStop: 60, lap: 1200 };

function legs(changes: Partial<ShuttleWay> = {}): ShuttleWay {
  // As the provider gives them: 0 from the boarding stop itself.
  const away: Record<number, number> = { 3: 600, 5: 300, 6: 60, 7: 0, 8: 1020 };
  return {
    stops: [
      { order: 7, name: '301동', rideSeconds: 0 },
      { order: 8, name: '유전공학연구소', rideSeconds: 180 },
      { order: 9, name: '교수회관', rideSeconds: SECONDS.ride },
    ],
    walkToStopSeconds: SECONDS.toStop,
    waitSeconds: SECONDS.wait,
    walkFromStopSeconds: SECONDS.fromStop,
    ridesToBoarding: Array.from({ length: 14 }, (_, order) => away[order] ?? 1200),
    lapSeconds: SECONDS.lap,
    ...changes,
  };
}

// A walk of that many minutes, and the shuttle's legs, or none running.
const timed = (walkMinutes: number, shuttle: ShuttleWay | null = legs()): WayArgs['travel'] => ({
  walkingSeconds: () => walkMinutes * 60,
  shuttleWay: () => shuttle,
});

const at = (clock: string, seconds = 0): Date => new Date(onDay(TUESDAY, clock).getTime() + seconds * 1000);

function lookupOf(given: Partial<Omit<WayArgs, 'now' | 'placeOf'>>, now = NOW): Lookup {
  const answer = wayFor(now, {
    location: { at: position('제1공학관'), placeId: id('제1공학관'), onCampus: true },
    toPlaceId: id('SK경영관'),
    ...given,
  });
  if (answer.result !== 'found') {
    throw new Error(`No way: ${answer.reason}`);
  }
  return answer.lookup;
}

// The text of each line, its parts joined.
const linesOf = ({ lines }: Lookup): string[] => lines.map((line) => line.map(({ text }) => text).join(''));

const reported = (): Lookup =>
  lookupOf({ travel: timed(20), shuttle: reporting([{ stop: '신소재공동연구소', at: NOW }]) });

// A ride of 15 minutes.
const slower = (): ShuttleWay =>
  legs({
    stops: [
      { order: 7, name: '301동', rideSeconds: 0 },
      { order: 8, name: '유전공학연구소', rideSeconds: 900 },
    ],
  });

const classAt1010 = (): DayItem => classAt(TUESDAY, '10:10', '11:00', 'SK경영관');

// On the seed's walking table and shuttle timing.
const toCultureHall = (now: Date): Lookup => lookupOf({ toPlaceId: id('문화관') }, now);

// The basis of a walk of 20 minutes, with one shuttle reported at that stop now.
const walkWith = (stop: string): string[] =>
  lookupOf({ travel: timed(20), shuttle: reporting([{ stop, at: NOW }]) }).basis;

describe('A shuttle reported before the boarding stop', () => {
  it('comes after the ride from the stop it passed last, and the User sets out in time for it', () => {
    expect(reported().basis[0]).toBe('10:03에 나서 정류장까지 2분 · 10:05 셔틀, 약 5분 뒤');
  });

  it('takes the User there 7 minutes before the walk, in 10 minutes from setting out', () => {
    expect(linesOf(reported())).toEqual(['셔틀이 7분 빨라요', '셔틀로 10분이에요']);
  });

  it('is flagged at the stop it passed last', () => {
    expect(reported().scene.flags[0]).toEqual({
      at: stopPosition('신소재공동연구소'),
      text: '셔틀 · 신소재공동연구소 지남',
      role: 'shuttle',
    });
  });
});

describe('No shuttle reported', () => {
  it('waits the average, setting out now, and the basis says so', () => {
    const lookup = lookupOf({ travel: timed(20) });

    expect(lookup.basis[0]).toBe('지금 나서 정류장까지 2분 · 오는 셔틀이 안 잡혀 기다림은 이 시간대 평균 3분');
    expect(lookup.scene.places[0]?.tag).toBe('301동 정류장 · 기다림 약 3분');
    expect(lookup.scene.flags.map(({ role }) => role)).not.toContain('shuttle');
  });

  it('is the same with a shuttle reported more than a minute ago', () => {
    const lookup = lookupOf({
      travel: timed(20),
      shuttle: reporting([{ stop: '신소재공동연구소', at: at('09:58', 30) }]),
    });

    expect(lookup.basis[0]).toBe('지금 나서 정류장까지 2분 · 오는 셔틀이 안 잡혀 기다림은 이 시간대 평균 3분');
  });
});

describe('A shuttle at the boarding stop or just past it', () => {
  it('has just left the stop when reported there, and comes again a lap after the report', () => {
    const lookup = lookupOf({ travel: timed(35), shuttle: reporting([{ stop: '301동', at: NOW }]) });

    expect(lookup.basis[0]).toBe('10:18에 나서 정류장까지 2분 · 10:20 셔틀, 약 20분 뒤');
    expect(lookup.scene.flags[0]?.text).toBe('셔틀 · 301동 지남');
  });

  it('comes nearly a lap later when reported at the stop after it', () => {
    const lookup = lookupOf({ travel: timed(35), shuttle: reporting([{ stop: '유전공학연구소', at: NOW }]) });

    expect(lookup.basis[0]).toBe('10:15에 나서 정류장까지 2분 · 10:17 셔틀, 약 17분 뒤');
  });

  it('leaves the walk either way, rather than the average wait', () => {
    expect(walkWith('301동')).toEqual(['301동 → SK경영관(58동) 걸어서 20분 · 앱의 도보표', '셔틀은 28분 걸려 걸어요']);
    expect(walkWith('유전공학연구소')).toEqual([
      '301동 → SK경영관(58동) 걸어서 20분 · 앱의 도보표',
      '셔틀은 25분 걸려 걸어요',
    ]);
  });
});

describe('A shuttle that comes to the stop before the User does', () => {
  it('is let go for another reported that comes before its next lap', () => {
    const lookup = lookupOf({
      travel: timed(25),
      shuttle: reporting([
        { stop: '302동', at: NOW },
        { stop: '농생대', at: NOW },
      ]),
    });

    expect(lookup.basis[0]).toBe('10:08에 나서 정류장까지 2분 · 10:10 셔틀, 약 10분 뒤');
    expect(lookup.scene.flags[0]?.text).toBe('셔틀 · 농생대 지남');
  });

  it('is caught on its next lap when no other is reported', () => {
    const lookup = lookupOf({ travel: timed(35), shuttle: reporting([{ stop: '302동', at: NOW }]) });

    expect(lookup.basis[0]).toBe('10:19에 나서 정류장까지 2분 · 10:21 셔틀, 약 21분 뒤');
    expect(lookup.scene.flags[0]?.text).toBe('셔틀 · 302동 지남');
  });

  it('comes round as many laps as it takes to reach the stop after the User', () => {
    const lookup = lookupOf({
      travel: timed(60, legs({ walkToStopSeconds: 1500 })),
      shuttle: reporting([{ stop: '302동', at: NOW }]),
    });

    expect(lookup.basis[0]).toBe('10:16에 나서 정류장까지 25분 · 10:41 셔틀, 약 41분 뒤');
  });
});

describe('The shuttle against the walk', () => {
  it('is taken when it arrives exactly 3 minutes earlier', () => {
    expect(linesOf(lookupOf({ travel: timed(16) }))).toEqual(['셔틀이 3분 빨라요', '셔틀로 13분이에요']);
  });

  it('is not taken when it arrives 2 minutes earlier, and the basis says why', () => {
    const lookup = lookupOf({ travel: timed(15) });

    expect(linesOf(lookup)).toEqual(['SK경영관(58동)은 여기예요', '지금 있는 301동에서 걸어서 15분']);
    expect(lookup.basis).toEqual([
      '301동 → SK경영관(58동) 걸어서 15분 · 앱의 도보표',
      '셔틀은 13분으로 걷기보다 3분 이상 빠르지 않아 걸어요',
    ]);
    expect(lookup.scene.routes.map(({ role }) => role)).toEqual(['me']);
  });
});

describe("A walk's basis", () => {
  it('does not name the shuttle for a walk of 14 minutes', () => {
    expect(lookupOf({ travel: timed(14, slower()) }).basis).toEqual([
      '301동 → SK경영관(58동) 걸어서 14분 · 앱의 도보표',
    ]);
  });

  it('names the shuttle for a walk of 15 minutes, slower even without a wait', () => {
    expect(lookupOf({ travel: timed(15, slower()) }).basis).toEqual([
      '301동 → SK경영관(58동) 걸어서 15분 · 앱의 도보표',
      '셔틀은 기다림 없이도 18분(정류장 2 · 타기 15 · 내려서 1)이라 걸어요',
    ]);
  });
});

describe('Late even by the shuttle', () => {
  it('says the arrival and how late, flags it, and offers route guidance only', () => {
    const lookup = lookupOf({ travel: timed(20), me: { userId: ME, name: '유상', items: [classAt1010()] } });

    expect(linesOf(lookup)).toEqual(['셔틀이 7분 빨라요', '10:00에 나서면 10:13 도착, 3분 늦어요']);
    expect(lookup.scene.flags).toEqual([{ at: position('SK경영관'), text: '10:13 도착 · 3분 늦어요', role: 'late' }]);
    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['guide']);
  });
});

describe('Outside the shuttle service', () => {
  it('walks after 21:00, and the basis says the shuttle is not running', () => {
    expect(toCultureHall(onDay(TUESDAY, '21:30')).basis).toEqual([
      '301동 → 문화관(73동) 걸어서 18분 · 앱의 도보표',
      '셔틀은 지금 다니지 않아요 (평일 8–21시)',
    ]);
  });

  it('walks at a weekend, and the basis says the shuttle is not running', () => {
    expect(toCultureHall(onDay('2026-11-21', '11:50')).basis).toEqual([
      '301동 → 문화관(73동) 걸어서 18분 · 앱의 도보표',
      '셔틀은 지금 다니지 않아요 (평일 8–21시)',
    ]);
  });
});
