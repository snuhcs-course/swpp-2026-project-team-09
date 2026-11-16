/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Partitions: Friends whose own end is above the Timetable, at it, and above it while the Friend's end is off; no
// Friends. No 파티, a 파티 whose own switch is off, and one whose own switch is on, alone and with others. Expected
// values: P06 ticket 6, whose words count the User's own end only.

import { MIN_JUN } from '../support/map-sources';
import type { Friend, FriendLevel, MyParty } from '@/api/types';
import { friendsLine, partyLine } from '@/features/sharing/sharing-lines';

function friend(id: string, level: FriendLevel, seen: FriendLevel): Friend {
  return {
    ...MIN_JUN,
    id,
    level,
    seen,
    sharing: level !== 'timetable',
    visible: seen !== 'timetable',
    askedOff: false,
    askedPlan: false,
  };
}

const MEMBER = { department: '컴퓨터공학부', leader: false, visible: true };

function party(sharing: boolean, others: number): MyParty {
  return {
    id: 'party-1',
    title: '한강 피크닉',
    capacity: 8,
    joinPolicy: 'open',
    quest: null,
    sharing,
    members: [
      { ...MEMBER, id: 'me', name: '나', leader: true },
      ...Array.from({ length: others }, (_, at) => ({ ...MEMBER, id: `member-${at}`, name: `멤버 ${at}` })),
    ],
  };
}

describe('the line of Friends the User allows', () => {
  it.each([
    ['no Friends', '위치 공유를 허용한 친구 0명', []],
    [
      'one at 정확한 위치 and one at 지금 있는 건물',
      '위치 공유를 허용한 친구 2명',
      [friend('a', 'exact', 'exact'), friend('b', 'building', 'building')],
    ],
    [
      'one at 시간표만',
      '위치 공유를 허용한 친구 1명',
      [friend('a', 'exact', 'exact'), friend('b', 'timetable', 'timetable')],
    ],
    [
      'one whose own end is off, which still counts',
      '위치 공유를 허용한 친구 2명',
      [friend('a', 'exact', 'timetable'), friend('b', 'building', 'timetable')],
    ],
  ])('%s → "%s"', (_, expected, friends) => {
    expect(friendsLine(friends)).toBe(expected);
  });
});

describe('the line of a 파티 the User allows', () => {
  it.each([
    ['no 파티', null, null],
    ['a 파티 with the own switch off', null, party(false, 3)],
    [
      'a 파티 with the own switch on and three others',
      '한강 피크닉 파티에서 위치 공유를 허용한 멤버 3명',
      party(true, 3),
    ],
    ['a 파티 with the own switch on and no others', '한강 피크닉 파티에서 위치 공유를 허용한 멤버 0명', party(true, 0)],
  ])('%s → %p', (_, expected, shown) => {
    expect(partyLine(shown)).toBe(expected);
  });
});

describe('the words of both lines', () => {
  it('never say who sees the User', () => {
    const lines = [friendsLine([friend('a', 'exact', 'timetable')]), partyLine(party(true, 2))];

    for (const line of lines) {
      expect(line).not.toMatch(/봐요|볼 수 있어요/u);
    }
  });
});
