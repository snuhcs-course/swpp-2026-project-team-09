/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { clockOf, type DayItem, freeTimeOf, onDay } from '../src/assistant/free-time/free-time.js';
import { mealWindow } from '../src/assistant/free-time/meal-fit.js';
import {
  type Gathering,
  gather,
  type GatheringMember,
  type GatheringPlace,
} from '../src/assistant/gathering/gathering.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { readSeedTravel, type SeedTravel } from '../src/travel/travel.js';
import { WALKING_TABLE_FILE, walkingTableSchema } from '../src/travel/walking-table.js';

// The design's worked example: lunch on Tuesday 2026-11-17, asked at 11:50, on the seed's walking table.
const DATE = '2026-11-17';
const at = (clock: string): Date => onDay(DATE, clock);
const when = { window: mealWindow(DATE, 'lunch'), now: at('11:50') };

let travel: SeedTravel;
const placeOf = new Map<string, string>();

beforeAll(async () => {
  travel = await readSeedTravel(SEED_DIRECTORY);
  const table = await readSeedFile(SEED_DIRECTORY, WALKING_TABLE_FILE, walkingTableSchema);
  for (const { id, name } of table.places) {
    placeOf.set(name, id);
  }
});

const id = (name: string): string => {
  const found = placeOf.get(name);
  if (found === undefined) {
    throw new Error(`The walking table has no ${name}`);
  }
  return found;
};

const classAt = (start: string, end: string, building: string): DayItem => ({
  id: `${building} ${start}`,
  name: 'Class',
  start: at(start),
  end: at(end),
  placeId: id(building),
  isClass: true,
});

const me = (): GatheringMember => ({
  id: '나',
  free: freeTimeOf([classAt('11:00', '11:50', '제1공학관'), classAt('13:00', '13:50', '자연과학관6')], DATE, when.now),
  locationPlaceId: null,
});

const minsu = (): GatheringMember => ({
  id: '민수',
  free: freeTimeOf([classAt('11:00', '12:15', '제2공학관')], DATE, when.now),
  locationPlaceId: null,
});

const jieun = (): GatheringMember => ({
  id: '지은',
  free: freeTimeOf([classAt('11:00', '12:15', '두산인문관'), classAt('13:00', '14:15', '두산인문관')], DATE, when.now),
  locationPlaceId: null,
});

const places = (): GatheringPlace[] => [
  { key: '301동식당', placeId: id('제1공학관') },
  { key: '302동식당', placeId: id('제2공학관') },
  { key: '학생회관식당', placeId: id('학생회관') },
  { key: '3식당', placeId: id('제3학생식당') },
  { key: '자하연식당', placeId: id('자하연식당') },
];

const plan = (members: [GatheringMember, ...GatheringMember[]]): Gathering => gather(members, places(), when, travel);

// Each fit as "key start–end (minutes)".
const lines = ({ fits }: Gathering): string[] =>
  fits.map(({ key, start, end, togetherMinutes }) => `${key} ${clockOf(start)}–${clockOf(end)} (${togetherMinutes})`);

const fitOf = (gathering: Gathering, key: string): Gathering['fits'][number] | undefined =>
  gathering.fits.find((fit) => fit.key === key);

describe('Lunch alone', () => {
  it('fits every place, the longest first', () => {
    expect(lines(plan([me()]))).toEqual([
      '301동식당 11:50–12:45 (55)',
      '학생회관식당 12:05–12:59 (54)',
      '3식당 12:03–12:54 (51)',
      '302동식당 11:53–12:43 (50)',
      '자하연식당 12:07–12:55 (48)',
    ]);
  });

  it('sets out from building 301 by the timetable, with no merging point', () => {
    const { fits } = plan([me()]);

    expect(fits.map(({ meeting }) => meeting)).toEqual([null, null, null, null, null]);
    expect(fits[0]?.parts[0]?.origin).toEqual({ placeId: id('제1공학관'), basis: 'timetable' });
  });
});

describe('Lunch with 민수', () => {
  it('fits every place, the longest first', () => {
    expect(lines(plan([me(), minsu()]))).toEqual([
      '302동식당 12:15–12:43 (28)',
      '301동식당 12:18–12:45 (27)',
      '학생회관식당 12:33–12:59 (26)',
      '3식당 12:31–12:54 (23)',
      '자하연식당 12:35–12:55 (20)',
    ]);
  });

  it('meets nowhere at the two buildings of their Classes', () => {
    const gathering = plan([me(), minsu()]);

    expect(fitOf(gathering, '302동식당')).toMatchObject({
      meeting: null,
      parts: [{ walkMinutes: 3, leaveAt: at('12:12') }, { walkMinutes: 0 }],
    });
    expect(fitOf(gathering, '301동식당')).toMatchObject({
      meeting: null,
      parts: [{}, { walkMinutes: 3, leaveAt: at('12:15') }],
    });
  });

  it('meets at building 301 at 12:18 on the way to the Student Center', () => {
    expect(fitOf(plan([me(), minsu()]), '학생회관식당')).toMatchObject({
      meeting: { placeId: id('제1공학관'), at: at('12:18'), memberIds: ['나', '민수'] },
      parts: [
        { walkMinutes: 15, leaveAt: at('12:18') },
        { walkMinutes: 18, leaveAt: at('12:15') },
      ],
    });
  });

  it('meets at building 301 at 12:18 on the way to Cafeteria 3 and the Jahayeon cafeteria', () => {
    const gathering = plan([me(), minsu()]);
    const meeting = { placeId: id('제1공학관'), at: at('12:18'), memberIds: ['나', '민수'] };

    expect(fitOf(gathering, '3식당')?.meeting).toEqual({ ...meeting, onwardMinutes: 13 });
    expect(fitOf(gathering, '자하연식당')?.meeting).toEqual({ ...meeting, onwardMinutes: 17 });
  });
});

describe('Lunch with 지은', () => {
  it('fits three places, the longest first, with no merging point', () => {
    const gathering = plan([me(), jieun()]);

    expect(lines(gathering)).toEqual([
      '자하연식당 12:18–12:55 (37)',
      '학생회관식당 12:20–12:55 (35)',
      '3식당 12:25–12:50 (25)',
    ]);
    expect(gathering.fits.map(({ meeting }) => meeting)).toEqual([null, null, null]);
  });

  // At building 301 지은 arrives at 12:31 and must leave at 12:44.
  it('drops the two engineering buildings, 지은 having 13 minutes at building 301', () => {
    const { dropped } = plan([me(), jieun()]);

    expect(dropped.map(({ key }) => key)).toEqual(['301동식당', '302동식당']);
    expect(dropped[0]?.shortest).toEqual({ memberId: '지은', minutes: 13 });
  });
});

describe('Lunch with 민수 and 지은', () => {
  it('fits three places, the longest first', () => {
    expect(lines(plan([me(), minsu(), jieun()]))).toEqual([
      '학생회관식당 12:33–12:55 (22)',
      '자하연식당 12:35–12:55 (20)',
      '3식당 12:31–12:50 (19)',
    ]);
  });

  it('meets 민수 at building 301 at 12:18 on the way to the Student Center, 지은 coming on her own', () => {
    expect(fitOf(plan([me(), minsu(), jieun()]), '학생회관식당')).toMatchObject({
      meeting: { placeId: id('제1공학관'), at: at('12:18'), memberIds: ['나', '민수'] },
      parts: [{}, {}, { walkMinutes: 5, arriveAt: at('12:20'), leaveAt: at('12:28'), leaveBy: at('12:55') }],
    });
  });

  it('meets at building 301 at 12:18 on the way to the Jahayeon cafeteria', () => {
    expect(fitOf(plan([me(), minsu(), jieun()]), '자하연식당')?.meeting).toMatchObject({ at: at('12:18') });
  });

  it('drops the two engineering buildings', () => {
    expect(plan([me(), minsu(), jieun()]).dropped.map(({ key }) => key)).toEqual(['301동식당', '302동식당']);
  });
});
