/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: a position's age at 2 and 10 minutes; a Friend seen or not, with a status, without one and with one
// contradicted; Friend Requests both ways. Expected values: P14-01's criteria and P06's todo.md (iteration 1).

import { HALL, measured, MIN_JUN, MINUTE, NOW } from '../support/map-sources';
import type { Friend, FriendStatus } from '@/api/types';
import { keptPositions, minutesOld, toFriendRequestViews, toFriendViews, withAge } from '@/features/friends/adapter';

function friend(visible: boolean, more: Partial<Friend> = {}): Friend {
  return { ...MIN_JUN, sharing: true, visible, ...more };
}

const LIBRARY: FriendStatus = {
  userId: 'min-jun',
  presence: 'free',
  where: '중앙도서관',
  detail: '공강 · 중앙도서관 근처 · 15:00까지 비어 있어요',
  walk: '도보 4분',
  photo: null,
};

describe('a position of a Friend by its age', () => {
  it.each([
    ['1 minute 59 seconds', 2 * MINUTE - 1000, null],
    ['2 minutes', 2 * MINUTE, 2],
    ['9 minutes 59 seconds', 10 * MINUTE - 1000, 9],
  ])('measured %s ago → minutesOld %s', (_, ago, expected) => {
    expect(minutesOld(measured('min-jun', ago), NOW)).toBe(expected);
  });

  it.each([
    ['9 minutes 59 seconds', 10 * MINUTE - 1000, 1],
    ['10 minutes', 10 * MINUTE, 0],
  ])('measured %s ago → kept %s', (_, ago, count) => {
    expect(keptPositions([measured('min-jun', ago)], NOW)).toHaveLength(count);
  });

  it.each([
    ['a line and no age', '공강 · 중앙도서관', null, '공강 · 중앙도서관'],
    ['a line and an age', '공강 · 중앙도서관', 3, '공강 · 중앙도서관 · 3분 전 위치'],
    ['no line and an age', '', 3, '3분 전 위치'],
  ])('withAge of %s → "%s"', (_, words, minutes, expected) => {
    expect(withAge(words, minutes)).toBe(expected);
  });
});

describe('toFriendViews of one Friend seen', () => {
  it('a Friend seen, with a status and a recent position → the status, its place and the position', () => {
    const [view] = toFriendViews([friend(true)], [measured('min-jun', MINUTE)], [LIBRARY], NOW);
    expect(view).toEqual({
      id: 'min-jun',
      name: '김민준',
      department: '경영학과',
      presence: 'free',
      line: '공강 · 중앙도서관',
      detail: '공강 · 중앙도서관 근처 · 15:00까지 비어 있어요',
      walk: '도보 4분',
      photo: null,
      position: HALL,
      minutesOld: null,
      visible: true,
      sharing: true,
    });
  });

  it('a Friend seen with an old position → its age in minutes', () => {
    const [view] = toFriendViews([friend(true)], [measured('min-jun', 5 * MINUTE)], [LIBRARY], NOW);
    expect(view?.minutesOld).toBe(5);
  });
});

describe("toFriendViews and the main server's word", () => {
  it('a Friend not seen, whose old position is still answered → 위치 꺼짐 and no position', () => {
    const [view] = toFriendViews([friend(false)], [measured('min-jun', MINUTE)], [], NOW);
    expect(view).toMatchObject({ presence: 'off', line: '위치 꺼짐', position: null, minutesOld: null });
  });

  it('a Friend seen without a status → 공강 alone', () => {
    const [view] = toFriendViews([friend(true)], [], [], NOW);
    expect(view).toMatchObject({ presence: 'free', line: '공강', detail: '', walk: '', photo: null });
  });

  it("a Friend not seen whose status says seen → the main server's word, 위치 꺼짐", () => {
    const [view] = toFriendViews([friend(false)], [], [LIBRARY], NOW);
    expect(view).toMatchObject({ presence: 'off', line: '위치 꺼짐', detail: '' });
  });

  it('a Friend seen whose position the main server no longer keeps → no position', () => {
    const [view] = toFriendViews([friend(true)], [measured('min-jun', 10 * MINUTE)], [LIBRARY], NOW);
    expect(view?.position).toBeNull();
  });

  it("several Friends → in the Friends' order, each with its own position", () => {
    const friends = [friend(true, { id: 'b', name: '이서연' }), friend(true, { id: 'a' })];
    const views = toFriendViews(friends, [measured('a', MINUTE), measured('b', MINUTE)], [], NOW);
    expect(views.map(({ id, position }) => [id, position !== null])).toEqual([
      ['b', true],
      ['a', true],
    ]);
  });
});

describe('toFriendRequestViews', () => {
  it('requests received and sent → the other User of each', () => {
    const views = toFriendRequestViews({
      received: [{ id: 'r1', sender: { name: '김민준', department: '경영학과' }, sentAt: '2026-10-06T03:00:00Z' }],
      sent: [{ id: 's1', receiver: { name: '이서연', department: '경영학과' }, sentAt: '2026-10-06T03:00:00Z' }],
    });
    expect(views).toEqual({
      received: [{ id: 'r1', name: '김민준', department: '경영학과' }],
      sent: [{ id: 's1', name: '이서연', department: '경영학과' }],
    });
  });
});
