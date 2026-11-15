/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type FriendView } from '../src/friends/dto/friend-view.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { friendNowLine } from '../src/assistant/refusals/refusals.js';

// Where a Friend is now, in the second line of n6 ("민수 어제 어디 있었어?"), from what the Friend view shows the asker
// and the Friend's Classes of the day. Partitions: the level (Timetable only, the building, exact with and without a
// Place), and the time against the Classes (in one with and without a Place, between two, before the first, after the
// last, none today).

const PLACES: Record<string, string> = { 'place-302': '302동', 'place-301': '301동' };

const placeLabel = (placeId: string): string | null => PLACES[placeId] ?? null;

const at = (clock: string): Date => new Date(`2096-02-07T${clock}:00+09:00`);

function classOf(start: string, end: string, placeId: string | null = 'place-302'): DayItem {
  return { id: `${start}-${end}`, name: '비밀 강의', start: at(start), end: at(end), placeId, isClass: true };
}

function viewOf(level: FriendView['level'], placeId: string | null = null): FriendView {
  const position =
    level === 'exact' ? { latitude: 37.45, longitude: 126.95, measuredAt: at('11:49').toISOString() } : null;
  return {
    id: 'minsu',
    name: '민수',
    department: '컴퓨터공학부',
    friendId: 'MS4K8P2R',
    friendsSince: '2096-01-05T10:00:00+09:00',
    level,
    position,
    placeId,
  };
}

const CLASSES = [classOf('09:00', '09:50', 'place-301'), classOf('11:00', '12:15'), classOf('14:00', '15:15')];

describe('A Friend who shows the asker only their Timetable', () => {
  it.each([
    ['in a Class with a Place (board n6)', CLASSES, '11:50', '민수는 지금 302동에서 수업 중이에요 · 12:15까지'],
    ['in a Class without a Place', [classOf('11:00', '12:15', null)], '11:50', '민수는 지금 수업 중이에요 · 12:15까지'],
    ['between two Classes', CLASSES, '12:30', '민수는 지금 공강이에요 · 14:00까지'],
    ['before the first Class', CLASSES, '08:00', '민수는 09:00에 첫 수업이 있어요'],
    ['after the last Class', CLASSES, '16:00', '민수는 오늘 수업이 끝났어요'],
    ['with no Class today', [], '11:50', '민수는 오늘 수업이 없어요'],
  ])('is %s', (_, classes, clock, words) => {
    expect(friendNowLine(viewOf('timetable'), classes, at(clock), placeLabel)).toBe(words);
  });
});

describe('A Friend whose Place the view shows', () => {
  it('at the building, is there, with the end of the Class they are in', () => {
    expect(friendNowLine(viewOf('building', 'place-301'), CLASSES, at('11:50'), placeLabel)).toBe(
      '민수는 지금 301동에 있어요 · 12:15까지 수업',
    );
  });

  it('exactly, in a Place and out of Class, is there', () => {
    expect(friendNowLine(viewOf('exact', 'place-302'), CLASSES, at('12:30'), placeLabel)).toBe(
      '민수는 지금 302동에 있어요',
    );
  });

  it('exactly, in no Place, is told by the Timetable', () => {
    expect(friendNowLine(viewOf('exact'), CLASSES, at('11:50'), placeLabel)).toBe(
      '민수는 지금 302동에서 수업 중이에요 · 12:15까지',
    );
  });
});
