/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { type FriendView } from '../src/friends/dto/friend-view.dto.js';
import { walkingMinutes } from '../src/assistant/gathering/gathering-travel.js';
import { otherFriendsOf, type SetOut, setOutOf } from '../src/assistant/gathering/other-friends.js';
import { at, item, walks } from './gathering-fixtures.js';

// The asker's other Friends for picking (P04 ticket 64): a Friend's walk to the Plan's Place, known, hidden by the
// location level, and from a Place the walking table has no row for. Expected values: 120 seconds from 'A' to 'P'.

function friendAt(level: FriendView['level'], placeId: string | null): FriendView {
  return {
    id: `friend-${String(placeId)}-${level}`,
    name: '김태현',
    department: '컴퓨터공학부',
    friendId: 'KT0000AA',
    friendsSince: '2026-10-01T09:00:00+09:00',
    level,
    position: null,
    placeId,
  };
}

const DATE = '2026-11-17';
const NOW = at('16:30');
const days = { itemsOn: (): Promise<never[]> => Promise.resolve([]) };
const travel = walks(['A', 'P', 120], ['83', 'P', 180], ['K', 'P', 240], ['16', 'P', 300], ['43-1', 'P', 720]);

async function walkOf(friend: FriendView): Promise<number | null> {
  const [other] = await otherFriendsOf([friend], DATE, { days, travel });
  return other === undefined
    ? null
    : setOutOf(other, { start: at('17:00'), end: at('18:00') }, { date: DATE, now: NOW, placeId: 'P' }).walkMinutes;
}

// With nothing in their day, from where the Friend view puts them.
describe("An other Friend's walk to the Plan's Place", () => {
  it('is the walking table’s minutes from the Place the Friend is in', async () => {
    await expect(walkOf(friendAt('building', 'A'))).resolves.toBe(2);
  });

  it('is unknown where the location level shows no Place', async () => {
    await expect(walkOf(friendAt('timetable', null))).resolves.toBeNull();
  });

  it('is unknown from a Place the walking table has no row for, rather than failing the answer', async () => {
    await expect(walkOf(friendAt('building', 'NEW'))).resolves.toBeNull();
  });
});

function walk(from: string, to: string): number {
  return walkingMinutes(from, to, travel);
}

function setOut(items: DayItem[], locationPlaceId: string | null, from: string, until: string): SetOut {
  const other = { userId: 'f', name: '친구', items, locationPlaceId, walk };
  return setOutOf(other, { start: at(from), end: at(until) }, { date: DATE, now: NOW, placeId: 'P' });
}

// P04 ticket 68 (board z3, the user's words of 2026-11-26): where an other Friend sets out from, by the planner's rule
// for a picked person, asked at 16:30 for a Plan at 17:00–18:00 and at 18:30–19:30 at 'P'. Partitions: free after a
// Class with a Place that ends after now; busy over the span, by a Class that ends inside or after it; nothing in their
// day near now, with and without a Place the Friend view gives; neither a day item nor a Place. Expected values: the
// walks of the table in minutes, and the item set out after.
describe('Where an other Friend sets out from', () => {
  const TAEHYUN = item('15:30', '16:45', '83');
  const JAEHYUN = item('16:30', '18:15', '16');
  const LONG_AGO = item('13:00', '14:15', '83');

  it.each([
    ['17:00', '18:00'],
    ['18:30', '19:30'],
  ])('from the Place of a Class that ends after now, whatever their position, at %s', (from, until) => {
    expect(setOut([TAEHYUN], 'K', from, until)).toEqual({ walkMinutes: 3, after: TAEHYUN });
  });

  it('from the Class they are busy with at 17:00, by the stretch they come free in', () => {
    expect(setOut([JAEHYUN], null, '17:00', '18:00')).toEqual({ walkMinutes: 5, after: JAEHYUN });
  });

  it('from the Class that ended before 18:30', () => {
    expect(setOut([JAEHYUN], null, '18:30', '19:30')).toEqual({ walkMinutes: 5, after: JAEHYUN });
  });

  it.each([
    ['17:00', '18:00'],
    ['18:30', '19:30'],
  ])('from where the Friend view puts them when their day has nothing near now, at %s', (from, until) => {
    expect(setOut([LONG_AGO], 'K', from, until)).toEqual({ walkMinutes: 4, after: null });
  });

  it.each([
    ['17:00', '18:00'],
    ['18:30', '19:30'],
  ])('from nowhere known without a Place in their day near now or from the Friend view, at %s', (from, until) => {
    expect(setOut([LONG_AGO], null, from, until)).toEqual({ walkMinutes: null, after: null });
    expect(setOut([], null, from, until)).toEqual({ walkMinutes: null, after: null });
  });
});
