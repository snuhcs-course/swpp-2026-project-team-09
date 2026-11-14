/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { cardAddress } from '../src/notifications/card-address.js';
import { identityOf } from '../src/notifications/notification.js';
import { wordsOf } from '../src/notifications/notification-words.js';

const QUEST_ID = '0b9f7c5e-2a4d-4e8b-9c1a-3f6e5d7a8b90';
const FRIEND_ID = 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

describe('The words of an answer to an invitation', () => {
  it.each([
    ['accepted', '민수', '민수가 수락했어요'],
    ['accepted', '지은', '지은이 수락했어요'],
    ['declined', '민수', '민수가 못 온대요'],
    ['declined', '지은', '지은이 못 온대요'],
  ] as const)('%s by %s reads "%s", under the Quest’s title, on the party’s card', (kind, friendName, title) => {
    expect(wordsOf({ kind, questId: QUEST_ID, questTitle: '저녁 같이', friendId: FRIEND_ID, friendName })).toEqual({
      title,
      line: '저녁 같이',
      card: { kind: 'party', id: QUEST_ID },
      about: FRIEND_ID,
    });
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
