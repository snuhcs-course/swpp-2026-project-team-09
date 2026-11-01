/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { answerOf, type Window } from '../eval/p5/large-world/answers.ts';
import { answeredAt, type IntendedCall, type Stage, untilOf } from '../eval/p5/large-world/server-stages.ts';
import {
  type LargeGlobalEvent,
  type LargeQuest,
  type LargeWorldData,
  questSchema,
} from '../eval/p5/large-world/world-data.ts';

// How the large world's answers are computed from its attributes by the rules (eval/p5/rules.md), and how the generator
// reckons what each ticket's search answers, on a few records by hand.

const quest = (key: string, starts: string, more: Partial<LargeQuest> = {}): LargeQuest =>
  questSchema.parse({
    key,
    title: '볼링 치러 가요',
    description: '',
    activity: 'bowling',
    capacity: 4,
    holders: 2,
    started: false,
    asker: 'none',
    joinPolicy: 'open',
    board: 'hobby',
    starts,
    ends: `${starts.slice(0, 11)}23:50`,
    place: { label: '볼링장' },
    ...more,
  });

const forEvent = (key: string, globalEvent: string, more: Partial<LargeQuest> = {}): LargeQuest =>
  questSchema.parse({
    key,
    title: '볼링 치러 가요',
    description: '',
    activity: 'bowling',
    capacity: 4,
    holders: 2,
    started: false,
    asker: 'none',
    joinPolicy: 'open',
    board: 'show',
    globalEvent,
    ...more,
  });

const event = (key: string, starts: string, ends: string | null, activity = 'photo'): LargeGlobalEvent => ({
  key,
  title: '사진전',
  description: '',
  activity,
  starts,
  ends,
  place: '미술관',
  latitude: 37.46,
  longitude: 126.95,
});

function worldOf(quests: LargeQuest[], globalEvents: LargeGlobalEvent[] = []): LargeWorldData {
  return {
    version: 'test',
    randomSeed: 1,
    now: '2026-11-02T14:05',
    asker: { name: '가', department: '나' },
    people: [],
    places: {
      가까운곳: { number: '1', latitude: 37.45, longitude: 126.95 },
    },
    globalEvents,
    quests,
  };
}

const day = (date: string): Window => ({ from: `${date}T00:00`, to: `${date}T23:59` });

const questsFor = (world: LargeWorldData, window: Window, more: object = {}): string[] =>
  answerOf({ quests: { window, ...more } }, world).quests;

const titled = (key: string, title: string): LargeGlobalEvent => ({ ...event(key, '2026-11-06T10:00', null), title });

describe('What the rules count as in a window', () => {
  it('holds both ends of a window, and nothing a minute outside', () => {
    const world = worldOf([
      quest('before', '2026-11-05T16:59'),
      quest('start', '2026-11-05T17:00'),
      quest('end', '2026-11-05T22:00'),
      quest('after', '2026-11-05T22:01'),
    ]);

    expect(questsFor(world, { from: '2026-11-05T17:00', to: '2026-11-05T22:00' })).toEqual(['start', 'end']);
  });

  it('leaves out a Quest that already started, and keeps one for an event under way', () => {
    const world = worldOf(
      [quest('started', '2026-11-02T14:00'), quest('ahead', '2026-11-02T14:10'), forEvent('for-event', 'under-way')],
      [event('under-way', '2026-10-28T10:00', '2026-11-09T18:20')],
    );

    expect(questsFor(world, day('2026-11-02'))).toEqual(['ahead', 'for-event']);
  });
});

describe('What the rules count as under way', () => {
  it('leaves out a Quest for an event that ended', () => {
    const world = worldOf([forEvent('for-event', 'over')], [event('over', '2026-10-28T10:00', '2026-11-01T18:20')]);

    expect(questsFor(world, day('2026-11-02'))).toEqual([]);
  });

  it('takes an event by overlap, and one without an end until the end of its start’s day', () => {
    const world = worldOf(
      [],
      [
        event('running', '2026-11-01T10:00', '2026-11-09T18:20'),
        event('no-end', '2026-11-04T19:00', null),
        event('other-day', '2026-11-05T19:00', '2026-11-05T21:20'),
      ],
    );

    expect(answerOf({ events: { window: day('2026-11-04') } }, world).globalEvents).toEqual(['running', 'no-end']);
    expect(
      answerOf({ events: { window: { from: '2026-11-04T23:00', to: '2026-11-04T23:59' } } }, world).globalEvents,
    ).toEqual(['running', 'no-end']);
  });
});

describe('What the rules never offer', () => {
  it('leaves out Full, Closed, held and already asked Quests', () => {
    const world = worldOf([
      quest('open', '2026-11-03T12:00'),
      quest('full', '2026-11-03T12:00', { holders: 4 }),
      quest('closed', '2026-11-03T12:00', { joinPolicy: 'closed', board: null }),
      quest('held', '2026-11-03T12:00', { asker: 'holds' }),
      quest('asked', '2026-11-03T12:00', { asker: 'asked' }),
    ]);

    expect(questsFor(world, day('2026-11-03'))).toEqual(['open']);
  });

  it('leaves out every Quest of an event of which the asker holds a Shared Quest', () => {
    const world = worldOf(
      [forEvent('mine', 'e', { asker: 'holds' }), forEvent('other', 'e')],
      [event('e', '2026-11-03T12:00', '2026-11-03T14:20')],
    );

    expect(questsFor(world, day('2026-11-03'))).toEqual([]);
  });
});

describe('What a question narrows', () => {
  it('counts only the activities, the capacity and the places left it asks for', () => {
    const world = worldOf([
      quest('bowling', '2026-11-03T12:00'),
      quest('tennis', '2026-11-03T12:00', { activity: 'tennis' }),
      quest('of-six', '2026-11-03T12:00', { capacity: 6, holders: 5 }),
    ]);

    expect(questsFor(world, day('2026-11-03'), { activities: ['tennis'] })).toEqual(['tennis']);
    expect(questsFor(world, day('2026-11-03'), { capacity: 6 })).toEqual(['of-six']);
    expect(questsFor(world, day('2026-11-03'), { minPlacesLeft: 2 })).toEqual(['bowling', 'tennis']);
  });

  it('measures a nearby Place, and leaves out words only', () => {
    const world = worldOf([
      quest('near', '2026-11-03T12:00', { place: { label: '근처', latitude: 37.4505, longitude: 126.95 } }),
      quest('far', '2026-11-03T12:00', { place: { label: '먼 곳', latitude: 37.46, longitude: 126.95 } }),
      quest('words', '2026-11-03T12:00', { place: { label: '근처' } }),
      quest('none', '2026-11-03T12:00', { place: null }),
    ]);

    expect(questsFor(world, day('2026-11-03'), { near: { place: '가까운곳', metres: 300 } })).toEqual(['near']);
  });
});

describe('What a question about an event or its words takes', () => {
  it('takes an event’s 파티 and those of its activity within its span, but not another event’s', () => {
    const world = worldOf(
      [
        forEvent('its', 'named', { activity: 'photo' }),
        forEvent('another', 'other', { activity: 'photo' }),
        quest('within', '2026-11-04T12:00', { activity: 'photo' }),
        quest('outside', '2026-11-06T12:00', { activity: 'photo' }),
        quest('other-activity', '2026-11-04T12:00', { activity: 'art' }),
      ],
      [event('named', '2026-11-04T10:00', '2026-11-05T18:20'), event('other', '2026-11-04T10:00', '2026-11-05T18:20')],
    );

    expect(questsFor(world, day('2026-11-04'), { forEvent: 'named' })).toEqual(['its', 'within']);
  });

  it('tells 대면 from 비대면 by the title', () => {
    const world = worldOf([], [titled('in-person', '대면 특강'), titled('online', '비대면 특강')]);
    const window = day('2026-11-06');

    expect(answerOf({ events: { window, titleHolds: '비대면' } }, world).globalEvents).toEqual(['online']);
    expect(answerOf({ events: { window, titleLacks: '비대면' } }, world).globalEvents).toEqual(['in-person']);
  });
});

describe('What each ticket’s search answers, as the generator reckons it', () => {
  // 25 Quests in the morning, then what the question wants in the evening.
  const morning = Array.from({ length: 25 }, (_, index) =>
    quest(`m${index}`, `2026-11-03T09:${String(index).padStart(2, '0')}`, {
      title: '학식 같이 먹어요',
      activity: 'cafeteria',
    }),
  );
  const wanted = quest('late', '2026-11-03T21:00');
  const world = worldOf([...morning, wanted]);
  const byDay: IntendedCall = { tool: 'searchRecruitingQuests', input: { from: '2026-11-03', to: '2026-11-03' } };
  const inTheEvening: IntendedCall = { tool: 'searchRecruitingQuests', input: { after: '2026-11-03T17:00' } };
  const byWord: IntendedCall = {
    tool: 'searchRecruitingQuests',
    input: { from: '2026-11-03', to: '2026-11-03', words: ['볼링'] },
  };

  it.each<[Stage, IntendedCall, boolean]>([
    ['today', byDay, false],
    ['today', inTheEvening, false],
    ['ticket 10', inTheEvening, true],
    ['ticket 10', byWord, false],
    ['ticket 11', byWord, true],
  ])('at %s: %o holds the evening one: %s', (stage, intended, holds) => {
    expect(answeredAt(stage, intended, world).includes('late')).toBe(holds);
  });

  it('marks what each case waits for', () => {
    expect(untilOf([inTheEvening], ['late'], world)).toBe(10);
    expect(untilOf([byWord], ['late'], world)).toBe(11);
    expect(untilOf([inTheEvening], [], world)).toBeNull();
  });

  it('marks a misspelt post that no word brings among 30 candidates as waiting for search stage 1', () => {
    const crowded = worldOf([
      ...Array.from({ length: 35 }, (_, index) =>
        quest(`b${index}`, `2026-11-03T09:${String(index).padStart(2, '0')}`),
      ),
      quest('typo', '2026-11-03T21:00', { title: '볼림 치러 가요' }),
    ]);

    expect(untilOf([byWord], ['typo'], crowded)).toBe('search stage 1');
  });
});
