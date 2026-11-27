/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { cardAddress } from '../src/notifications/card-address.js';
import { identityOf } from '../src/notifications/notification.js';
import { wordsOf } from '../src/notifications/notification-words.js';

const QUEST_ID = '0b9f7c5e-2a4d-4e8b-9c1a-3f6e5d7a8b90';
const FRIEND_ID = 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
// 12:18 in Korea.
const AT = new Date('2026-11-17T03:18:00Z');

describe('The words of an answer to an invitation', () => {
  it.each([
    ['accepted', '민수', '민수가 수락했어요'],
    ['accepted', '지은', '지은이 수락했어요'],
    ['declined', '민수', '민수가 못 온대요'],
    ['declined', '지은', '지은이 못 온대요'],
  ] as const)(
    '%s by %s reads "%s", under the Quest’s title, on the party’s card, ringing no phone',
    (kind, friendName, title) => {
      expect(
        wordsOf({ kind, questId: QUEST_ID, questTitle: '저녁 같이', friendId: FRIEND_ID, friendName }, AT),
      ).toEqual({
        title,
        ahead: null,
        line: '저녁 같이',
        card: { kind: 'party', id: QUEST_ID },
        about: FRIEND_ID,
        rings: false,
        body: null,
      });
    },
  );
});

describe('The words of the time to leave', () => {
  const leaveBy = { kind: 'leave-by', questId: QUEST_ID, placeLabel: '학생회관식당', walkMinutes: 15 } as const;

  it('reads "지금 나서요" once the time has come and the time in Korea before it, with the walk under it, and rings', () => {
    expect(wordsOf(leaveBy, AT)).toEqual({
      title: '지금 나서요',
      ahead: '12:18 나설 시각',
      line: '학생회관식당까지 걸어서 15분',
      card: { kind: 'party', id: QUEST_ID },
      about: null,
      rings: true,
      body: '학생회관식당까지 걸어서 15분이에요.',
    });
  });

  it('writes the hour and the minutes with a leading zero', () => {
    expect(wordsOf(leaveBy, new Date('2026-11-17T00:05:00Z')).ahead).toBe('09:05 나설 시각');
  });
});

describe('The words of a new match of a watched interest', () => {
  const news = { kind: 'interest-new', id: QUEST_ID, startsAt: AT, placeLabel: '학생회관' } as const;

  it('names an event with the subject particle, with its start in Korea and its Place, on its card, and rings', () => {
    expect(wordsOf({ ...news, subject: 'event', title: '2026 하반기 채용박람회' }, AT)).toEqual({
      title: '2026 하반기 채용박람회가 떴어요',
      ahead: null,
      line: '오늘 12:18 학생회관',
      card: { kind: 'event', id: QUEST_ID },
      about: null,
      rings: true,
      body: '오늘 12:18 학생회관이에요.',
    });
  });

  it('names a Quest as recruiting, on its party card', () => {
    expect(wordsOf({ ...news, subject: 'quest', title: '배드민턴 칠 사람' }, AT)).toMatchObject({
      title: '배드민턴 칠 사람 모집이 떴어요',
      card: { kind: 'party', id: QUEST_ID },
    });
  });

  it.each([
    [null, '학생회관', '학생회관', '학생회관이에요.'],
    [null, '아크로', '아크로', '아크로예요.'],
    [AT, null, '오늘 12:18', '오늘 12:18에 시작해요.'],
    [null, null, '', '맡겨 둔 관심에 맞아요.'],
  ])('leaves out what is unknown: %s and %s give "%s" and "%s"', (startsAt, placeLabel, line, body) => {
    expect(wordsOf({ ...news, subject: 'event', title: '전시', startsAt, placeLabel }, AT)).toMatchObject({
      line,
      body,
    });
  });
});

describe('The day of a time in a Notification', () => {
  const news = { kind: 'interest-new', id: QUEST_ID, subject: 'event', title: '전시', placeLabel: null } as const;
  // AT is Tuesday 17 November 2026 at 12:18 in Korea.
  it.each([
    ['later today', '2026-11-17T14:00:00Z', '오늘 23:00'],
    ['tomorrow', '2026-11-18T05:00:00Z', '내일 14:00'],
    ['tomorrow just after midnight', '2026-11-17T15:10:00Z', '내일 00:10'],
    ['any later day, without a year', '2026-11-27T05:00:00Z', '11/27(금) 14:00'],
    ['a day of another year', '2027-01-04T00:30:00Z', '1/4(월) 09:30'],
  ])('says the day %s', (_case, startsAt, line) => {
    expect(wordsOf({ ...news, startsAt: new Date(startsAt) }, AT).line).toBe(line);
  });

  it('says the day of a changed step', () => {
    const changed = {
      kind: 'step-changed',
      questId: QUEST_ID,
      byId: FRIEND_ID,
      byName: '민수',
      stepTitle: '정문 앞에서 만나기',
      startsAt: new Date('2026-11-18T05:10:00Z'),
      cancelled: false,
    } as const;

    expect(wordsOf(changed, AT).line).toBe('내일 14:10 정문 앞에서 만나기');
  });
});

describe('The identity of a Notification', () => {
  it('is its kind and its card', () => {
    expect(identityOf('accepted', { kind: 'party', id: QUEST_ID })).toBe(
      'accepted:party:0b9f7c5e-2a4d-4e8b-9c1a-3f6e5d7a8b90',
    );
  });

  it('ends with the person it is about, when it is about one', () => {
    expect(identityOf('declined', { kind: 'party', id: QUEST_ID }, FRIEND_ID)).toBe(
      'declined:party:0b9f7c5e-2a4d-4e8b-9c1a-3f6e5d7a8b90:c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    );
  });
});

describe('The address of a card', () => {
  it('opens the card on the main screen', () => {
    expect(cardAddress({ kind: 'party', id: QUEST_ID })).toBe('/main?card=party:0b9f7c5e-2a4d-4e8b-9c1a-3f6e5d7a8b90');
  });

  it('takes a kind with a hyphen and an id with dots and commas', () => {
    expect(cardAddress({ kind: 'study-space', id: '7F-7A.zone2,3' })).toBe('/main?card=study-space:7F-7A.zone2,3');
  });

  it.each([
    ['an uppercase kind', { kind: 'Party', id: QUEST_ID }],
    ['an empty kind', { kind: '', id: QUEST_ID }],
    ['an empty id', { kind: 'party', id: '' }],
    ['an id with a slash', { kind: 'party', id: 'a/b' }],
    ['an id with a space', { kind: 'party', id: 'a b' }],
  ])('refuses %s', (_case, card) => {
    expect(() => cardAddress(card)).toThrow();
  });
});
