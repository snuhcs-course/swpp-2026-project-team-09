/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: a Friend and a Party member, recent, old (2 minutes) and too old (10 minutes); a member who is a
// Friend or unseen; the cards' order. Expected values: P06-09's, P13-01's and P14-01's criteria (iteration 1).

import {
  event,
  friendView,
  GYM_POINT,
  HALL,
  LIBRARY_POINT,
  measured,
  member,
  ME,
  MIN_JUN,
  MINUTE,
  myParty,
  quest,
  SEO_YEON,
  sources,
} from '../support/map-sources';
import { toCards } from '@/features/map/adapter';

describe('toCards of Friends', () => {
  it('a Friend with a recent position → the Avatar, the status and the way, and 파티 만들기', () => {
    const [card] = toCards(sources({ friends: [friendView(MIN_JUN)], positions: [measured('min-jun', MINUTE)] }));
    expect(card).toEqual({
      id: 'friend:min-jun',
      kind: 'friend',
      mark: { type: 'person', id: 'min-jun', name: '김민준', photo: null, presence: 'free', stale: false },
      marker: { name: '김민준 · 공강 · 중앙도서관 근처', short: '민준', count: 0, minutesOld: null },
      subLabel: '경영학과',
      title: '김민준',
      lines: [
        { icon: 'info', text: '공강 · 중앙도서관 근처' },
        { icon: 'route', text: '도보 4분' },
      ],
      primary: { label: '파티 만들기', action: 'private-party', userId: 'min-jun' },
      secondary: null,
      position: HALL,
    });
  });

  it('a Friend whose position is 5 minutes old → dimmed, with the age in place of the status', () => {
    const friends = [friendView(MIN_JUN, { detail: '', walk: '' })];
    const [card] = toCards(sources({ friends, positions: [measured('min-jun', 5 * MINUTE)] }));
    expect(card).toMatchObject({ mark: { stale: true }, marker: { name: '김민준', minutesOld: 5 } });
    expect(card?.lines).toEqual([{ icon: 'info', text: '마지막 위치 5분 전' }]);
  });

  it.each([
    ['whose position is 10 minutes old', friendView(MIN_JUN), 10 * MINUTE],
    ['without a position', friendView(MIN_JUN, { position: null }), MINUTE],
  ])('a Friend %s → no card', (_, friend, ago) => {
    expect(toCards(sources({ friends: [friend], positions: [measured('min-jun', ago)] }))).toEqual([]);
  });
});

describe("toCards of the User's Party", () => {
  it('a member who is no Friend → a card that opens the Party; the User and a Friend get none here', () => {
    const members = [ME, MIN_JUN, SEO_YEON].map((person) => member(person, true));
    const positions = [
      measured('me', MINUTE),
      measured('min-jun', MINUTE, LIBRARY_POINT),
      measured('seo-yeon', MINUTE, GYM_POINT),
    ];
    const friends = [friendView(MIN_JUN, { position: LIBRARY_POINT })];
    const cards = toCards(sources({ myParty: myParty('q9', members), friends, positions }));
    expect(cards.map(({ id, position }) => [id, position])).toEqual([
      ['friend:min-jun', LIBRARY_POINT],
      ['party-member:seo-yeon', GYM_POINT],
    ]);
    expect(cards[1]).toMatchObject({
      mark: { type: 'person', presence: null, stale: false },
      marker: { name: '이서연 · 활성 파티 멤버 · 위치 공유 중', short: '서연' },
      subLabel: '경영학과 · 친구 아님',
      lines: [{ icon: 'info', text: '활성 파티 멤버 · 위치 공유 중' }],
      primary: { label: '파티 열기', action: 'active-party' },
    });
  });

  it('a member whose position is 3 minutes old → the age', () => {
    const party = myParty(null, [member(SEO_YEON, true)]);
    const [card] = toCards(sources({ myParty: party, positions: [measured('seo-yeon', 3 * MINUTE)] }));
    expect(card?.lines).toEqual([{ icon: 'info', text: '마지막 위치 3분 전' }]);
  });

  it.each([
    ['the User does not see', member(SEO_YEON, false), [measured('seo-yeon', MINUTE)]],
    ['without a position', member(SEO_YEON, true), []],
    ['whose position is 10 minutes old', member(SEO_YEON, true), [measured('seo-yeon', 10 * MINUTE)]],
  ])('a member %s → no card', (_, one, positions) => {
    expect(toCards(sources({ myParty: myParty(null, [one]), positions }))).toEqual([]);
  });
});

describe('toCards order', () => {
  it('one of each → the Events, the Quests, the Friends, then the Party members', () => {
    const cards = toCards(
      sources({
        quests: [quest('q1')],
        friends: [friendView(MIN_JUN)],
        myParty: myParty(null, [member(SEO_YEON, true)]),
        positions: [measured('min-jun', MINUTE), measured('seo-yeon', MINUTE)],
        globalEvents: [event('e1')],
      }),
    );
    expect(cards.map(({ kind }) => kind)).toEqual(['global-event', 'shared-quest', 'friend', 'party-member']);
  });
});
