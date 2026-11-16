/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { friendView, HALL, MIN_JUN } from '../support/map-sources';
import { friendProfileCard, profileLabel, profileOf } from '@/features/friends/profile';

describe('profileOf at each level', () => {
  // Partitions: the three levels of what the two see of each other. The words: row 6's boards a10, a4, and a13.
  it.each([
    ['timetable', '시간표만 보여요'],
    ['building', '지금 있는 건물까지 보여요'],
    ['exact', '정확한 위치까지 보여요'],
  ] as const)('says what the User sees at %s', (seen, words) => {
    expect(profileOf(friendView(MIN_JUN, { seen })).seen).toBe(words);
  });
});

describe('profileOf with the Friend ID and the date', () => {
  // Partitions: both fields there, both left out; the date at the edge of a day of Korea's calendar, a minute before
  // and after its midnight. The words: ticket 18, "10월 3일부터 친구".
  it('says the Friend ID and since when the two have been Friends', () => {
    const friend = friendView(MIN_JUN, { friendId: 'KM4J8QZA', friendsSince: '2026-10-03T14:05:00+09:00' });

    expect(profileOf(friend)).toEqual({
      seen: '정확한 위치까지 보여요',
      friendId: '친구 ID KM4J8QZA',
      since: '10월 3일부터 친구',
    });
  });

  it('leaves out each line whose field is missing', () => {
    expect(profileOf(friendView(MIN_JUN))).toEqual({ seen: '정확한 위치까지 보여요', friendId: null, since: null });
  });

  it.each([
    ['2026-10-02T14:59:00.000Z', '10월 2일부터 친구'],
    ['2026-10-02T15:00:00.000Z', '10월 3일부터 친구'],
  ])("dates %s by Korea's calendar", (friendsSince, words) => {
    expect(profileOf(friendView(MIN_JUN, { friendsSince })).since).toBe(words);
  });
});

describe('friendProfileCard', () => {
  // Partitions: a Friend with a recent position, with an old one, and with none. The rule: the coordinator's of
  // 2026-11-15, the lines the Friend's card on the everyday map shows today, and none without a position.
  it('a Friend with a recent position → the Avatar, the status and the way, and 파티 만들기', () => {
    expect(friendProfileCard(friendView(MIN_JUN))).toEqual({
      id: 'friend:min-jun',
      mark: { type: 'person', id: 'min-jun', name: '김민준', photo: null, presence: 'free', stale: false },
      subLabel: '경영학과',
      title: '김민준',
      lines: [
        { icon: 'info', text: '공강 · 중앙도서관 근처' },
        { icon: 'route', text: '도보 4분' },
      ],
      primary: { label: '파티 만들기', action: 'private-party', userId: 'min-jun' },
    });
  });

  it('a Friend whose position is 3 minutes old → dimmed, with the age in place of the status', () => {
    const card = friendProfileCard(friendView(MIN_JUN, { position: HALL, minutesOld: 3 }));

    expect(card.mark).toMatchObject({ stale: true });
    expect(card.lines).toEqual([
      { icon: 'info', text: '마지막 위치 3분 전' },
      { icon: 'route', text: '도보 4분' },
    ]);
  });

  it('a Friend without a position → no line', () => {
    expect(friendProfileCard(friendView(MIN_JUN, { position: null, seen: 'timetable' })).lines).toEqual([]);
  });
});

describe('profileLabel', () => {
  // Partitions: one name. The words: ticket 18, a screen reader hears the mark as "김민수 프로필".
  it('names the button that opens a profile by the full name', () => {
    expect(profileLabel('김민수')).toBe('김민수 프로필');
  });
});
