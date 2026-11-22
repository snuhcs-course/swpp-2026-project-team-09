/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Plan, type PlanPart } from '../src/assistant/dto/answer.dto.js';
import { wordsOf } from '../src/notifications/notification-words.js';
import { aloneLeaveBy, goingLine, nextWordOf } from '../src/plans/alone-plan.js';

// "여기로" (P03 ticket 15): the leave-by of a Plan taken alone and the card's lines, over boards s1, s2, s4, s4b and s5
// ("배고파" at 301동 at 11:50 on Tuesday 2026-11-17, the next Class 13:00 at 24동) and the design's 6.3 Alone 2 and 3.

const ME = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const C24 = { placeId: '6c1f2f1e-24aa-5d0a-9b1c-24c24c24c24c', label: '24동', latitude: 37.4582, longitude: 126.9496 };
const R301 = {
  placeId: '1a242be2-05c6-5185-bcd1-0b78bc358f88',
  label: '301동식당',
  latitude: 37.45,
  longitude: 126.95,
};
const HAKGWAN = {
  placeId: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b',
  label: '학생회관식당',
  latitude: 37.46,
  longitude: 126.95,
};
const DURE = {
  placeId: '0b8e1c4e-67aa-5d0a-9b1c-670670670670',
  label: '두레문예관',
  latitude: 37.45,
  longitude: 126.95,
};
// 11:50 in Korea, when the User asks.
const NOW = new Date('2026-11-17T02:50:00Z');

function part(own: Partial<PlanPart>): PlanPart {
  return {
    userId: ME,
    name: '유상',
    me: true,
    origin: null,
    leaveAt: null,
    walkMinutes: 0,
    leaveBy: null,
    next: null,
    ...own,
  };
}

function plan(place: Plan['place'], own: PlanPart, title = `${place.label}에서 점심`): Plan {
  const range = { startAt: '2026-11-17T11:30:00+09:00', endAt: '2026-11-17T13:30:00+09:00' };
  return {
    id: place.label,
    title,
    place,
    startAt: '2026-11-17T12:05:00+09:00',
    endAt: '2026-11-17T12:59:00+09:00',
    togetherMinutes: 54,
    meeting: null,
    parts: [own],
    subQuests: [],
    lines: [],
    basis: [],
    scene: { people: [], places: [], routes: [], flags: [] },
    band: { range, now: '2026-11-17T11:50:00+09:00', lanes: [], ...range, text: '' },
  };
}

const CLASS = { startAt: '2026-11-17T13:00:00+09:00', place: C24 };
// Board s1: 301동식당 where the User is, eaten until 12:45, then 15 minutes to 24동.
const S1 = plan(
  R301,
  part({ walkMinutes: 0, leaveAt: '2026-11-17T11:50:00+09:00', leaveBy: '2026-11-17T12:45:00+09:00', next: CLASS }),
);
// Board s2: 학생회관식당 15 minutes away, eaten until 12:59, then 1 minute to 24동.
const S2 = plan(
  HAKGWAN,
  part({ walkMinutes: 15, leaveAt: '2026-11-17T11:50:00+09:00', leaveBy: '2026-11-17T12:59:00+09:00', next: CLASS }),
);

const words = (line: { text: string }[]): string => line.map(({ text }) => text).join('');

// Partitions: a walk on of 5 minutes or more, under 5, nothing next, a next item without a Place, and a time already
// passed. Expected values: the boards' words and times, worked out
// by hand.
describe('the leave-by of a Plan taken alone', () => {
  it('is kept for 12:45 when the walk on to the Class takes 15 minutes (s4b)', () => {
    const { facts, at, line } = aloneLeaveBy(S1, '수업', NOW);

    expect(at?.toISOString()).toBe('2026-11-17T03:45:00.000Z');
    expect(line).toBe('12:45에 나설 시각을 알려 드릴게요');
    expect(facts).toEqual({
      kind: 'leave-by',
      placeLabel: '24동',
      walkMinutes: 15,
      toward: { start: '13:00', word: '수업' },
    });
  });

  it('is not kept when the walk on takes 1 minute, and says so (s4)', () => {
    expect(aloneLeaveBy(S2, '수업', NOW)).toEqual({
      facts: null,
      at: null,
      line: '수업까지 1분이라 나설 알림은 없어요',
    });
  });

  it('is not kept when nothing follows today', () => {
    expect(aloneLeaveBy(plan(R301, part({})), '수업', NOW).line).toBe('오늘은 다음 일정이 없어 나설 알림은 없어요');
  });

  it('is not kept for a next item without a Place', () => {
    const noPlace = plan(R301, part({ leaveBy: CLASS.startAt, next: { startAt: CLASS.startAt, place: null } }));

    expect(aloneLeaveBy(noPlace, '일정', NOW)).toEqual({
      facts: null,
      at: null,
      line: '일정까지 0분이라 나설 알림은 없어요',
    });
  });

  it('is not kept once its time has passed, and says when to leave', () => {
    expect(aloneLeaveBy(S1, '수업', new Date('2026-11-17T03:50:00Z'))).toEqual({
      facts: null,
      at: null,
      line: '12:45엔 나서야 해요',
    });
  });
});

// Partitions: a way there still ahead and long enough, by shuttle, and one under 5 minutes. Expected values: the
// design's 6.3 Alone 2.
describe('the leave-by of a Plan taken alone, before the way there', () => {
  it('is the way there when that is still ahead and long enough, by shuttle to the concert at 17:42 (Alone 2)', () => {
    const concert = plan(
      DURE,
      part({ leaveAt: '2026-11-17T17:42:00+09:00', walkMinutes: 18, mode: 'shuttle' }),
      '동아리 정기공연',
    );

    const { facts, at } = aloneLeaveBy(concert, '수업', NOW);

    expect(at?.toISOString()).toBe('2026-11-17T08:42:00.000Z');
    expect(facts).toEqual({ kind: 'leave-by', placeLabel: '두레문예관', walkMinutes: 18, by: 'shuttle' });
  });

  it('is the walk on when the way there is under 5 minutes, as the company session at 15:56 (Alone 2)', () => {
    const session = plan(R301, part({ leaveAt: '2026-11-17T15:56:00+09:00', walkMinutes: 4 }));

    expect(aloneLeaveBy(session, '수업', NOW).line).toBe('오늘은 다음 일정이 없어 나설 알림은 없어요');
  });
});

// At 11:47:20, and 학생회관식당 with the walk on to the 13:00 Class from 12:45, its way there setting out at `leaveAt`.
const OFF = new Date('2026-11-17T02:47:20Z');
const walk = (leaveAt: string): Plan =>
  plan(
    HAKGWAN,
    part({
      walkMinutes: 15,
      leaveAt: `2026-11-17T${leaveAt}:00+09:00`,
      leaveBy: '2026-11-17T12:45:00+09:00',
      next: CLASS,
    }),
  );

// Partitions: a meal now and an event under way, asked off the minute; a way there that sets out later. Expected values:
// the review of PR 334. At 11:47:20 the planners read 11:48; 학생회관식당 15 minutes away is reached at 12:03, started at
// 12:05, so its way there sets out at 11:50, and an event under way at once.
describe('the leave-by of a Plan taken alone, asked off the minute', () => {
  it.each([
    ['a meal now, setting out at 11:50', '11:50'],
    ['an event under way, setting out at 11:48', '11:48'],
  ])('keeps the walk on to the Class for %s', (_, leaveAt) => {
    const { facts, line } = aloneLeaveBy(walk(leaveAt), '수업', OFF);

    expect(facts).toMatchObject({ placeLabel: '24동', walkMinutes: 15 });
    expect(line).toBe('12:45에 나설 시각을 알려 드릴게요');
  });

  it('keeps the way there when it sets out more than five minutes after now, at 11:54', () => {
    const { facts, line } = aloneLeaveBy(walk('11:54'), '수업', OFF);

    expect(facts).toMatchObject({ placeLabel: '학생회관식당', walkMinutes: 15 });
    expect(line).toBe('11:54에 나설 시각을 알려 드릴게요');
  });
});

// Partitions: a meal walked to, a meal where the User is, a meet where the User is, and an event. Expected values: boards
// s4 and s4b, and the design's 6.3 Alone 3.
describe('the first line of the card', () => {
  it.each<[string, Plan, 'meal' | 'meet' | 'events', string]>([
    ['a meal walked to', S2, 'meal', '학생회관식당으로 가요'],
    ['a meal where the User is', S1, 'meal', '301동식당에서 먹어요'],
    ['a meet where the User is', S1, 'meet', '301동식당에서 봐요'],
    ['an event', plan(DURE, part({}), '채용박람회'), 'events', '채용박람회에 가요'],
  ])('reads for %s', (_, shown, kind, expected) => {
    expect(words(goingLine(shown, kind))).toBe(expected);
  });

  it('strengthens the Place or the event', () => {
    expect(goingLine(S2, 'meal')[0]).toEqual({ text: '학생회관식당', strong: true });
  });
});

// Partitions: an until chip of a Class, of another item, and none.
describe('what the next item is called', () => {
  it.each<[string, { kind: 'until' | 'origin'; text: string; userId: null }[], string]>([
    ['a Class', [{ kind: 'until', text: '13:00 수업까지', userId: null }], '수업'],
    ['another item', [{ kind: 'until', text: '13:00까지', userId: null }], '일정'],
    ['no until chip', [{ kind: 'origin', text: '301동에서', userId: null }], '일정'],
  ])('is read from the until chip for %s', (_, chips, expected) => {
    expect(nextWordOf({ chips })).toBe(expected);
  });
});

// Expected values: board s5's push and the design's 6.3 Alone 2.
describe('the leave-by of a Plan taken alone, on by the shuttle', () => {
  it('says the shuttle when the way on to the Class is by it', () => {
    const byShuttle = plan(
      R301,
      part({
        walkMinutes: 0,
        leaveAt: '2026-11-17T11:50:00+09:00',
        leaveBy: '2026-11-17T12:47:00+09:00',
        next: { ...CLASS, by: 'shuttle' },
      }),
    );
    const { facts } = aloneLeaveBy(byShuttle, '수업', NOW);

    expect(facts).toMatchObject({ walkMinutes: 13, by: 'shuttle' });
    expect(facts === null ? null : wordsOf({ ...facts, questId: 'q' }, new Date('2026-11-17T03:47:00Z')).line).toBe(
      '24동까지 셔틀로 13분',
    );
  });
});

describe('the words of the leave-by of a Plan taken alone', () => {
  it("read board s5's push, with the Class it is for", () => {
    const told = {
      kind: 'leave-by',
      questId: '7d7d7d7d-0000-4000-8000-000000000001',
      placeLabel: '24동',
      walkMinutes: 15,
      toward: { start: '13:00', word: '수업' },
    } as const;

    expect(wordsOf(told, new Date('2026-11-17T03:45:00Z'))).toMatchObject({
      title: '지금 나서요',
      ahead: '12:45 나설 시각',
      line: '24동까지 걸어서 15분',
      card: { kind: 'party', id: told.questId },
      body: '24동까지 걸어서 15분이에요. 13:00 수업에 맞아요.',
    });
  });

  it('say a shuttle ride as one', () => {
    const told = {
      kind: 'leave-by',
      questId: '7d7d7d7d-0000-4000-8000-000000000001',
      placeLabel: '두레문예관',
      walkMinutes: 18,
      by: 'shuttle',
    } as const;

    expect(wordsOf(told, new Date('2026-11-17T08:42:00Z'))).toMatchObject({
      line: '두레문예관까지 셔틀로 18분',
      body: '두레문예관까지 셔틀로 18분이에요.',
    });
  });
});
