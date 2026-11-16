/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import {
  edgeTowards,
  inArea,
  longestStay,
  type StudyArea,
  type StudyDay,
  studyDayOf,
  stayAt,
} from '../src/assistant/lookup/study-near.js';
import { type WayArgs, type WayStart } from '../src/assistant/lookup/way.js';

// The visible area of "이 근처" and the stay at a study space, on Places A to N and walking times given here.
// Expected values are worked out by hand: the minutes are the seconds divided by 60, rounded up.

const DATE = '2026-11-17';
const at = (clock: string): Date => onDay(DATE, clock);

const SECONDS: Record<string, number> = {
  'A S1': 480,
  'S1 N': 480,
  'A S2': 150,
  'S2 N': 900,
  'A S3': 600,
  'S3 N': 360,
  'A S4': 421,
  'S4 N': 480,
  'B S1': 300,
};

function walkingSeconds(from: string, to: string): number {
  const seconds = SECONDS[`${from} ${to}`] ?? SECONDS[`${to} ${from}`];
  if (seconds === undefined) {
    throw new Error(`No walk from ${from} to ${to}`);
  }
  return seconds;
}

const walking = { walkingSeconds };

const item = (start: string, end: string, placeId: string | null, isClass = true): DayItem => ({
  id: `${placeId ?? 'none'} ${start}`,
  name: 'Class',
  start: at(start),
  end: at(end),
  placeId,
  isClass,
});

// The asker at that time, on campus in A unless the location is given.
function wayAt(now: Date, items: DayItem[], location: WayArgs['location'] = inA): WayArgs {
  return {
    now,
    me: { userId: 'me', name: '유상', items },
    location,
    fromPlaceId: null,
    toPlaceId: null,
    by: null,
    gatePlaceId: 'G',
    travel: walking,
    shuttle: { stops: [], reported: [] },
    placeOf: () => {
      throw new Error('No Place is named here');
    },
  };
}

const inA: WayArgs['location'] = { at: { latitude: 0, longitude: 0 }, placeId: 'A', onCampus: true };

// A Class in A until 11:50, and the next at 13:00 in N.
const day = (): DayItem[] => [item('11:00', '11:50', 'A'), item('13:00', '13:50', 'N')];

const FROM_A: WayStart = { placeId: 'A', basis: 'location' };

const started = (ready: string, start: WayStart, next: DayItem | null): StudyDay & { start: WayStart } => ({
  ready: at(ready),
  start,
  next,
});

const nextAt = (clock: string, placeId: string | null = 'N', isClass = true): DayItem =>
  item(clock, '13:50', placeId, isClass);

describe('The visible area', () => {
  const area: StudyArea = { south: 0, west: 0, north: 2, east: 2 };

  it('holds a point inside it and on its edge, and not one outside', () => {
    expect(inArea(area, { latitude: 1, longitude: 1.5 })).toBe(true);
    expect(inArea(area, { latitude: 2, longitude: 0 })).toBe(true);
    expect(inArea(area, { latitude: 2.1, longitude: 1 })).toBe(false);
    expect(inArea(area, { latitude: 1, longitude: -0.1 })).toBe(false);
  });

  // From the centre (1, 1): the line to the point leaves the area where it first reaches a side.
  it.each([
    ['north', { latitude: 5, longitude: 2 }, { latitude: 2, longitude: 1.25 }, '↑'],
    ['south', { latitude: -1, longitude: 1.5 }, { latitude: 0, longitude: 1.25 }, '↓'],
    ['west', { latitude: 1, longitude: -3 }, { latitude: 1, longitude: 0 }, '←'],
    ['east', { latitude: 1.5, longitude: 4 }, { latitude: 1 + 0.5 / 3, longitude: 2 }, '→'],
    ['north, through the corner', { latitude: 3, longitude: 3 }, { latitude: 2, longitude: 2 }, '↑'],
  ])('points %s to a point beyond that side', (_, target, edge, arrow) => {
    const { at: point, arrow: shown } = edgeTowards(area, target);

    expect(shown).toBe(arrow);
    expect(point.latitude).toBeCloseTo(edge.latitude, 12);
    expect(point.longitude).toBeCloseTo(edge.longitude, 12);
  });
});

describe('When and where the User sets out', () => {
  it('is now, from where they are, after a Class that has ended, and the stay ends at the next item', () => {
    const items = day();

    expect(studyDayOf(wayAt(at('12:10'), items))).toEqual({ ready: at('12:10'), start: FROM_A, next: items[1] });
  });

  it('is now rounded up to the whole minute', () => {
    expect(studyDayOf(wayAt(new Date(at('12:10').getTime() + 20_000), day())).ready).toEqual(at('12:11'));
  });

  it('is the end of the Class under way, from its Place, whatever the location says', () => {
    const items = [item('11:00', '12:15', 'B'), item('13:00', '13:50', 'N')];

    expect(studyDayOf(wayAt(at('12:10'), items))).toEqual({
      ready: at('12:15'),
      start: { placeId: 'B', basis: 'timetable' },
      next: items[1],
    });
  });

  it('has no next item when nothing follows today', () => {
    expect(studyDayOf(wayAt(at('14:00'), day())).next).toBeNull();
  });

  it('has no start without a location and without an item that has ended today', () => {
    expect(studyDayOf(wayAt(at('10:00'), day(), null)).start).toBeNull();
  });

  it('is the main gate off campus', () => {
    const off = { at: { latitude: 0, longitude: 0 }, placeId: null, onCampus: false };

    expect(studyDayOf(wayAt(at('12:10'), day(), off)).start).toEqual({ placeId: 'G', basis: 'gate' });
  });
});

describe('The stay at a study space', () => {
  // Board a9: 8 minutes to S1, arriving at 12:18; 8 minutes on to the 13:00 Class, leaving by 12:52.
  it('runs from the arrival to the time to leave for the next item', () => {
    expect(stayAt(started('12:10', FROM_A, nextAt('13:00')), 'S1', walking)).toEqual({
      walkMinutes: 8,
      arrival: at('12:18'),
      leaveBy: at('12:52'),
      minutes: 34,
    });
  });

  it('counts a part of a minute on foot as a whole one: 421 seconds is 8 minutes', () => {
    expect(stayAt(started('12:10', FROM_A, nextAt('13:00')), 'S4', walking).walkMinutes).toBe(8);
  });

  it('starts at once in the building the User sets out from', () => {
    expect(stayAt(started('12:10', { placeId: 'S1', basis: 'location' }, nextAt('13:00')), 'S1', walking)).toEqual({
      walkMinutes: 0,
      arrival: at('12:10'),
      leaveBy: at('12:52'),
      minutes: 42,
    });
  });

  it('starts at the end of the Class under way: 12:15 from B, 5 minutes to S1, until 12:52', () => {
    const fromB: WayStart = { placeId: 'B', basis: 'timetable' };

    expect(stayAt(started('12:15', fromB, nextAt('13:00')), 'S1', walking).minutes).toBe(32);
  });

  it('runs to the start of a next item that has no Place', () => {
    expect(stayAt(started('12:10', FROM_A, nextAt('13:00', null, false)), 'S1', walking)).toMatchObject({
      leaveBy: at('13:00'),
      minutes: 42,
    });
  });

  it('has no end when nothing follows today', () => {
    expect(stayAt(started('12:10', FROM_A, null), 'S1', walking)).toEqual({
      walkMinutes: 8,
      arrival: at('12:18'),
      leaveBy: null,
      minutes: null,
    });
  });
});

// The space of the longest stay from A at 12:10.
function pick(next: DayItem | null, spaces: string[]): string | null {
  const stays = spaces.map((space) => ({ space, stay: stayAt(started('12:10', FROM_A, next), space, walking) }));
  return longestStay(stays)?.space ?? null;
}

describe('The longest stay', () => {
  // S1: 12:18 to 12:52, 34 minutes. S2: 3 minutes there, 15 on, 12:13 to 12:45, 32 minutes.
  it('is the longer stay, not the nearer space', () => {
    expect(pick(nextAt('13:00'), ['S2', 'S1'])).toBe('S1');
  });

  // S3: 10 minutes there, 6 on, 12:20 to 12:54, 34 minutes, as long as S1's.
  it('is the shorter walk of two equal stays', () => {
    expect(pick(nextAt('13:00'), ['S3', 'S1'])).toBe('S1');
  });

  // S4: 8 minutes there (421 seconds), 8 on, as S1.
  it('is the first in the list of two equal stays with equal walks', () => {
    expect(pick(nextAt('13:00'), ['S4', 'S1'])).toBe('S4');
  });

  it('is the nearest when nothing follows today', () => {
    expect(pick(null, ['S1', 'S3', 'S2'])).toBe('S2');
  });

  // For a Class at 12:20: S1 12:18 to 12:12, −6 minutes; S2 12:13 to 12:05, −8 minutes.
  it('is the least short when none leaves time to stay', () => {
    expect(pick(nextAt('12:20'), ['S2', 'S1'])).toBe('S1');
  });

  it('is none of no space', () => {
    expect(pick(nextAt('13:00'), [])).toBeNull();
  });
});
