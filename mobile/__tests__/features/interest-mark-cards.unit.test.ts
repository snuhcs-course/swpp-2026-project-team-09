/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { KeptNotification } from '@/api/waiting-types';
import { toCards } from '@/features/map/adapter';
import { answerInputOf, cardsWithMarks, marksOf, markedLook, toldItems } from '@/features/map/interest-marks';
import { CONCERT, FIELD, inputs, JOB, markOf, matches, RECRUITING } from '../support/interest-marks';
import { friendView, MIN_JUN, NOW, sources } from '../support/map-sources';

// What the interest marks (P05 ticket 13) give the rest of the app: the answer a tap asks for, the map's cards, the
// items told as newly posted, and a mark's look.

// Partitions: a mark of events later today, of an event under way since yesterday, of an event on another day, of
// parties only. Expected values: the ticket's tap, the same answer as asking with the mark's items.
describe("a mark's answer", () => {
  it('asks for its events on the day of the earliest', () => {
    expect(answerInputOf(markOf({ eventIds: ['job', 'talk'] }), NOW)).toEqual({
      kind: 'events',
      date: '2026-10-06',
      eventIds: ['job', 'talk'],
    });
  });

  it.each([
    ['an event under way since yesterday', '2026-10-06', '2026-10-05T10:00:00+09:00'],
    ['an event tomorrow', '2026-10-07', '2026-10-07T12:00:00+09:00'],
  ])('%s → %s', (_case, date, firstStart) => {
    expect(answerInputOf(markOf({ firstStart }), NOW)).toMatchObject({ kind: 'events', date });
  });

  it('asks for the Quests of a mark of parties only', () => {
    const parties = markOf({ eventIds: [], questIds: ['run'], firstStart: null });

    expect(answerInputOf(parties, NOW)).toEqual({ kind: 'quests', globalEventId: null, questIds: ['run'] });
  });
});

// Partitions: the switch's cards of events matched and not, a Friend, a party matched and one already a card.
// Expected values: the ticket, other events are not on the map and a recruiting party gets a party card.
describe("the map's cards with the marks", () => {
  const cards = toCards(sources({ globalEvents: [JOB, CONCERT], friends: [friendView(MIN_JUN)] }));

  it('leaves out the events no mark holds, keeps the rest, and adds a card for each party a mark holds', () => {
    const marks = marksOf(inputs(matches([['job', true]], [['run', true]])));

    expect(cardsWithMarks(cards, marks, RECRUITING, NOW).map(({ id }) => id)).toEqual([
      'event:job',
      'friend:min-jun',
      'party:run',
    ]);
  });

  it('adds no second card for a party the map holds already', () => {
    const marks = marksOf(inputs(matches([], [['run', true]])));
    const once = cardsWithMarks([], marks, RECRUITING, NOW);

    expect(cardsWithMarks(once, marks, RECRUITING, NOW).map(({ id }) => id)).toEqual(['party:run']);
  });

  it("words a party's card as an open Party's, with 참여하기 to its room", () => {
    const marks = marksOf(inputs(matches([], [['run', true]])));

    expect(cardsWithMarks([], marks, RECRUITING, NOW)[0]).toMatchObject({
      id: 'party:run',
      kind: 'party',
      mark: { type: 'place', place: 'party' },
      marker: { name: '파티 · 러닝 크루 모집', count: 1 },
      subLabel: '파티 · 1/4명',
      title: '러닝 크루 모집',
      lines: [
        { icon: 'clock', text: '오늘 19:30' },
        { icon: 'pin', text: '문화관' },
      ],
      primary: { label: '참여하기', action: 'room', questId: 'run' },
      position: FIELD,
    });
  });
});

function kept(id: string, kind: string, url: string): KeptNotification {
  return { id, kind, title: '채용박람회가 떴어요', line: '14:00 문화관', at: '2026-10-06T12:30:00+09:00', url };
}

// Partitions: interest-new of an event and of a party, another kind, an address that is no card's. Expected values:
// the url `/main?card=<kind>:<id>` of ticket 08's Notification.
describe('the items told as newly posted', () => {
  it('are the cards of the kept interest-new Notifications', () => {
    const told = toldItems([
      kept('n1', 'interest-new', '/main?card=event:job'),
      kept('n2', 'interest-new', '/main?card=party:run'),
      kept('n3', 'leave-by', '/main?card=party:dinner'),
      kept('n4', 'interest-new', '/events'),
    ]);

    expect([...told]).toEqual(['event:job', 'party:run']);
  });
});

const PIN = { kind: 'official', form: 'pin', count: 2 } as const;
const GROUP = { kind: 'group', kinds: ['official', 'party'], form: 'dot' } as const;
const PERSON = { kind: 'person', id: 'min-jun', tone: 'free', name: '김민준', photo: null } as const;

// Partitions: a place's look, a group's, a person's; fresh, faded, plain, no mark. Expected values: decision 10, the
// fields only when set and only on a place or a group.
describe("a mark's look", () => {
  it.each([
    ['a fresh place', PIN, markOf({ look: 'fresh' }), { ...PIN, fresh: true }],
    ['a faded group', GROUP, markOf({ look: 'faded' }), { ...GROUP, faded: true }],
    ['a plain place', PIN, markOf({}), PIN],
    ['a place without a mark', PIN, undefined, PIN],
    ['a person', PERSON, markOf({ look: 'fresh' }), PERSON],
  ] as const)('%s', (_case, look, mark, expected) => {
    expect(markedLook(look, mark)).toEqual(expected);
  });
});
