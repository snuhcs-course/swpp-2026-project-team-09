/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { wordsOf } from '../src/notifications/notification-words.js';

const QUEST_ID = '0b9f7c5e-2a4d-4e8b-9c1a-3f6e5d7a8b90';
const FRIEND_ID = 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const AT = new Date('2026-11-17T03:18:00Z');
const ROOM = '관정 4층 6인실';
const CARD = { kind: 'party', id: QUEST_ID };

describe('The words of a companion going out of a room request', () => {
  const declined = { kind: 'room-declined', questId: QUEST_ID, roomLabel: ROOM, friendId: FRIEND_ID } as const;

  it('says who cannot come and how many more the room needs', () => {
    expect(wordsOf({ ...declined, friendName: '지은', moreNeeded: 1 }, AT)).toEqual({
      title: '지은이 못 온대요',
      ahead: null,
      line: '관정 4층 6인실 · 1명 더 필요해요',
      card: CARD,
      about: FRIEND_ID,
      rings: true,
      body: '관정 4층 6인실 · 1명 더 필요해요.',
    });
  });

  it('says the plan stays when the room’s minimum is still met', () => {
    expect(wordsOf({ ...declined, friendName: '민수', moreNeeded: 0 }, AT)).toMatchObject({
      title: '민수가 못 온대요',
      line: '관정 4층 6인실 · 계획은 그대로예요',
    });
  });
});

describe('The words of a room request every companion agreed to', () => {
  it.each([
    ['2026-11-19', '15:30', 180, '목 15:30–18:30 관정 4층 6인실'],
    ['2026-11-22', '09:00', 90, '일 09:00–10:30 관정 4층 6인실'],
    ['2026-11-16', '22:30', 30, '월 22:30–23:00 관정 4층 6인실'],
  ] as const)('on %s at %s for %i minutes reads "%s"', (date, start, minutes, line) => {
    expect(
      wordsOf(
        { kind: 'room-agreed', questId: QUEST_ID, roomLabel: ROOM, date, start, minutes, names: ['민수', '서준'] },
        AT,
      ),
    ).toEqual({
      title: '모두 동의했어요',
      ahead: null,
      line,
      card: CARD,
      about: null,
      rings: true,
      body: `${line}, 이제 예약할 수 있어요.`,
    });
  });
});

describe('The words of a room request waiting for the booking window', () => {
  it.each([
    ['2026-11-23', '09:00', 180, '2026-11-20T09:00:00+09:00', '11월 20일 09:00 예약 창 열림', '월 09:00–12:00 스터디'],
    ['2026-11-26', '15:30', 180, '2026-11-23T09:00:00+09:00', '11월 23일 09:00 예약 창 열림', '목 15:30–18:30 스터디'],
    ['2026-12-01', '21:30', 90, '2026-11-28T09:00:00+09:00', '11월 28일 09:00 예약 창 열림', '화 21:30–23:00 스터디'],
  ] as const)('on %s at %s for %i minutes, told at %s', (date, start, minutes, at, ahead, line) => {
    expect(wordsOf({ kind: 'room-window', questId: QUEST_ID, date, start, minutes }, new Date(at))).toEqual({
      title: '예약 창이 열렸어요',
      ahead,
      line,
      card: CARD,
      about: null,
      rings: true,
      body: `${line}를 이제 예약할 수 있어요.`,
    });
  });
});

describe('The words of a booked room ending', () => {
  it('reads "10분 뒤 끝나요" with the end, and the end while it is still to come', () => {
    expect(wordsOf({ kind: 'room-ending', questId: QUEST_ID, roomLabel: ROOM, end: '18:30' }, AT)).toEqual({
      title: '10분 뒤 끝나요',
      ahead: '18:30 방 예약 끝',
      line: '관정 4층 6인실 · 18:30에 끝나요',
      card: CARD,
      about: null,
      rings: true,
      body: '관정 4층 6인실 · 18:30에 끝나요.',
    });
  });
});
