/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { KeptNotification } from '@/api/waiting-types';
import { type CardView, toCards } from '@/features/map/adapter';
import { askOf, cardsWithMarks, marksAlone, marksOf, markedLook, toldItems } from '@/features/map/interest-marks';
import {
  CONCERT,
  FIELD,
  HALL_ID,
  inputs,
  JOB,
  markItem,
  markOf,
  matches,
  RECRUITING,
  RUN,
  TALK,
} from '../support/interest-marks';
import { friendView, MIN_JUN, NOW, sources } from '../support/map-sources';

// What the interest marks (P05 ticket 13) give the rest of the app: the answer a tap asks for, the map's cards, the
// items told as newly posted, and a mark's look.

const JOB_ITEM = markItem('event:job', JOB.startsAt);
const TALK_ITEM = markItem('event:talk', TALK.startsAt);
const TOMORROW = '2026-10-07T12:00:00+09:00';
const RUN_ITEM = markItem('party:run', '2026-10-06T19:30:00+09:00');

// Partitions: a mark of events later today, of an event under way since yesterday, of an event on another day, of
// events on two days with and without "!", of more events than an answer takes, of parties only, of events and a new
// party. Expected values: the ticket's tap, the same answer as asking, and the review of PR 306: "!" is cleared only
// for what the answer shows, and a mark with "!" answers with what is new.
describe("a mark's answer", () => {
  it('asks for its events on the day of the earliest, and shows them', () => {
    expect(askOf(markOf({ events: [JOB_ITEM, TALK_ITEM] }), NOW)).toEqual({
      input: { kind: 'events', date: '2026-10-06', eventIds: ['job', 'talk'] },
      shown: ['event:job', 'event:talk'],
    });
  });

  it.each([
    ['an event under way since yesterday', '2026-10-06', '2026-10-05T10:00:00+09:00'],
    ['an event tomorrow', '2026-10-07', TOMORROW],
  ])('%s → %s', (_case, date, start) => {
    expect(askOf(markOf({ events: [markItem('event:job', start)] }), NOW).input).toMatchObject({
      kind: 'events',
      date,
    });
  });

  it('leaves an event of another day out of the answer and out of what loses "!"', () => {
    const twoDays = markOf({ events: [JOB_ITEM, markItem('event:fair', TOMORROW, true)] });

    expect(askOf(markOf({ events: [JOB_ITEM, markItem('event:fair', TOMORROW)] }), NOW)).toEqual({
      input: { kind: 'events', date: '2026-10-06', eventIds: ['job'] },
      shown: ['event:job'],
    });
    expect(askOf(twoDays, NOW)).toEqual({
      input: { kind: 'events', date: '2026-10-07', eventIds: ['fair'] },
      shown: ['event:fair'],
    });
  });

  it('asks for at most 20 events', () => {
    const many = Array.from({ length: 21 }, (_none, index) => markItem(`event:e${String(index)}`, JOB.startsAt));

    expect(askOf(markOf({ events: many }), NOW).shown).toHaveLength(20);
  });

  it('asks for the Quests of a mark of parties only, or of one whose new items are parties', () => {
    const asked = { input: { kind: 'quests', globalEventId: null, questIds: ['run'] }, shown: ['party:run'] };

    expect(askOf(markOf({ events: [], parties: [RUN_ITEM] }), NOW)).toEqual(asked);
    expect(askOf(markOf({ events: [JOB_ITEM], parties: [{ ...RUN_ITEM, fresh: true }] }), NOW)).toEqual(asked);
  });
});

// Partitions: a mark of two at a place where only its items stand, one where another thing stands too, a mark of one.
// Expected values: decision 4, the place's own card stands where another thing shares the point.
describe('the marks the map draws as marks', () => {
  const [job] = toCards(sources({ globalEvents: [JOB] }));
  const mark = markOf({ id: HALL_ID, items: ['event:job', 'event:talk'], events: [JOB_ITEM, TALK_ITEM] });
  const within = (id: string): CardView[] => (job === undefined ? [] : [{ ...job, id, within: HALL_ID }]);

  it('keeps a mark whose place holds only its items', () => {
    expect([...marksAlone([mark], [...within('event:job'), ...within('event:talk')]).keys()]).toEqual([HALL_ID]);
  });

  it('leaves out a mark whose place holds another thing too', () => {
    expect(marksAlone([mark], [...within('event:job'), ...within('restaurant:hall')]).size).toBe(0);
  });

  it('keeps a mark of one item', () => {
    expect([...marksAlone([markOf({})], within('restaurant:hall')).keys()]).toEqual(['event:job']);
  });
});

// Partitions: the cards of events matched and not, a Friend, a party matched and one already a card.
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

  it("words a party's card as an open Party's, with 참여하기 to its post, where the User joins", () => {
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
      primary: { label: '참여하기', action: 'post', questId: 'run' },
      position: FIELD,
    });
  });

  it('words the button 참여 신청 for an Approval Quest', () => {
    const marks = marksOf(inputs(matches([], [['run', true]])));
    const approval = [{ ...RUN, joinPolicy: 'approval' as const }];

    expect(cardsWithMarks([], marks, approval, NOW)[0]?.primary).toEqual({
      label: '참여 신청',
      action: 'post',
      questId: 'run',
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
