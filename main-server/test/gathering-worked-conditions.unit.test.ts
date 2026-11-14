/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockOf } from '../src/assistant/free-time/free-time.js';
import { mealWindow } from '../src/assistant/free-time/meal-fit.js';
import { type Gathering, type GatheringPerson } from '../src/assistant/gathering/gathering.js';
import { at, DATE, gatheringPerson, id, jieunDay, minsuDay, myDay, NOW, plan, readWorld } from './worked-example.js';

// The design's worked example (lunch on Tuesday 2026-11-17, asked at 11:50, on the seed's walking table) with what the
// User fixed: the window, and a person's origin, "not before", and "leave by".

beforeAll(() => readWorld());

const me = (): GatheringPerson => gatheringPerson('나', myDay());
const minsu = (): GatheringPerson => gatheringPerson('민수', minsuDay());
const jieun = (): GatheringPerson => gatheringPerson('지은', jieunDay());

const lines = ({ fits }: Gathering): string[] =>
  fits.map(({ key, start, end, togetherMinutes }) => `${key} ${clockOf(start)}–${clockOf(end)} (${togetherMinutes})`);

const narrowed = (from: string, to: string): ReturnType<typeof mealWindow> => mealWindow(DATE, 'lunch', { from, to });

describe('Lunch with 민수 and 지은, the window ending at 12:50', () => {
  it('fits the three places to 12:50, the longest first', () => {
    expect(lines(plan([me(), minsu(), jieun()], undefined, NOW, narrowed('11:00', '12:50')))).toEqual([
      '3식당 12:31–12:50 (19)',
      '학생회관식당 12:33–12:50 (17)',
      '자하연식당 12:35–12:50 (15)',
    ]);
  });
});

const fromTwelveForty = (): Gathering => plan([me(), minsu()], undefined, NOW, narrowed('12:40', '14:30'));

describe('Lunch with 민수, the window starting at 12:40', () => {
  it('fits the Student Center and the Jahayeon cafeteria from 12:40', () => {
    expect(lines(fromTwelveForty())).toEqual(['학생회관식당 12:40–12:59 (19)', '자하연식당 12:40–12:55 (15)']);
  });

  it('drops the places with less than 15 minutes from 12:40', () => {
    expect(fromTwelveForty().dropped.map(({ key, togetherMinutes }) => `${key} (${togetherMinutes})`)).toEqual([
      '301동식당 (5)',
      '302동식당 (3)',
      '3식당 (14)',
    ]);
  });
});

const minsuLate = (key: string): Gathering['fits'][number] | undefined =>
  plan([me(), { ...minsu(), notBefore: at('12:20') }]).fits.find((fit) => fit.key === key);

describe('Lunch with 민수, who comes five minutes late', () => {
  it('has 민수 leave 302동 at 12:20', () => {
    expect(minsuLate('302동식당')).toMatchObject({
      start: at('12:20'),
      end: at('12:43'),
      togetherMinutes: 23,
      parts: [{}, { origin: { placeId: id('제2공학관') }, walkMinutes: 0, leaveAt: at('12:20') }],
    });
  });

  it('starts at 301동 at 12:23', () => {
    expect(minsuLate('301동식당')).toMatchObject({ start: at('12:23'), end: at('12:45'), togetherMinutes: 22 });
  });

  it('meets at 301동 at 12:23 on the way to the Student Center', () => {
    expect(minsuLate('학생회관식당')).toMatchObject({
      start: at('12:38'),
      end: at('12:59'),
      togetherMinutes: 21,
      meeting: { placeId: id('제1공학관'), at: at('12:23') },
    });
  });
});

describe('Lunch with 민수, the asker leaving by 12:30', () => {
  it('fits 302동 first, to 12:30, and drops 301동 with 12 minutes', () => {
    const gathering = plan([{ ...me(), leaveBy: at('12:30') }, minsu()]);

    expect(lines(gathering)[0]).toBe('302동식당 12:15–12:30 (15)');
    expect(gathering.dropped.find(({ key }) => key === '301동식당')?.togetherMinutes).toBe(12);
  });
});

describe('Lunch with 민수, the asker setting out from the Student Center', () => {
  it('has the asker there from 11:50 and 민수 come straight, with no meeting', () => {
    const gathering = plan([{ ...me(), chosenPlaceId: id('학생회관') }, minsu()]);

    expect(gathering.fits.find(({ key }) => key === '학생회관식당')).toMatchObject({
      start: at('12:32'),
      end: at('12:59'),
      togetherMinutes: 27,
      meeting: null,
      parts: [
        { origin: { placeId: id('학생회관'), basis: 'chosen' }, walkMinutes: 0, canArriveAt: at('11:50') },
        { walkMinutes: 17, canArriveAt: at('12:32') },
      ],
    });
  });
});
