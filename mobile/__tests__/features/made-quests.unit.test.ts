/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { Quest, SubQuest } from '@/api/types';
import type { Standing } from '@/features/assistant/invited-friends';
import { endedIds, flagWords, type MadeQuest, madeQuests } from '@/features/assistant/made-quests';

const ASKER = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';
// Before the stored Quest's meal on Tuesday 2026-11-17, which runs from 12:15 to 12:43 in Korea.
const BEFORE = new Date('2026-11-17T02:50:00.000Z');
const MADE = PLAN_QUEST.quest;
const MEAL = MADE.subQuests[0];

function steps(quest: Quest, change: (step: SubQuest, index: number) => SubQuest): Quest {
  return { ...quest, subQuests: quest.subQuests.map(change) };
}

// The Quest of the stored invitation card as its Leader reads it: the meeting at 301동 from 12:18 and the meal at the
// Student Center from 12:33, each step with the fields of a Sub Quest that the stored reply's step has, and the stored
// reply's members, 민수 invited. The stored card's title is "점심", without "에서".
const TWO_STEPS: Quest = {
  ...MADE,
  id: INVITATION_CARD.quest.id,
  title: INVITATION_CARD.quest.title,
  subQuests: INVITATION_CARD.steps.map(({ id, title, startsAt, endsAt, place }): SubQuest => ({
    id,
    title,
    startsAt,
    endsAt,
    place,
    attending: false,
    completion: 'by_time',
    cancelled: false,
    done: false,
    ended: false,
  })),
};

function standings(state: Standing['state']): Map<string, Standing> {
  return new Map([[MINSU, { state, lateMinutes: state === 'late' ? 5 : null }]]);
}

// `quest` as a Quest made from a Plan on this phone that the asker waits on, at `now`.
function onlyMade(quest: Quest, now = BEFORE): MadeQuest {
  const [made] = madeQuests([quest], ASKER, now, [quest.id]);
  if (made === undefined) {
    throw new Error('No Quest made from a Plan');
  }
  return made;
}

// Partitions: the stored reply's Quest for its Leader, its id kept and not kept; another User; no members known;
// members of the User alone; a Quest that is not Closed; a Class Quest; two steps, the meal last. Expected values:
// package C's spec, "A Plan becomes a Quest" (the asker leads it, Closed, its steps the Plan's with the meal last, an
// invitation for every Friend), and ticket 07's first decision: only a Quest whose id the phone kept counts.
describe('the Quests made from a Plan', () => {
  it('holds the stored Quest for its Leader once its id is kept, at its one step, with 민수 invited', () => {
    const [made] = madeQuests([MADE], ASKER, BEFORE, [MADE.id]);

    expect(made?.quest).toBe(MADE);
    expect(made?.destination).toEqual({
      step: MEAL,
      startsAt: '2026-11-17T03:15:00.000Z',
      at: { latitude: 37.44887, longitude: 126.95265 },
      words: '12:15 점심',
    });
    expect(made?.friends.map(({ name }) => name)).toEqual(['민수']);
  });

  it('holds none whose id the phone did not keep, as a Quest made from a Plan on another phone', () => {
    expect(madeQuests([MADE], ASKER, BEFORE, [])).toEqual([]);
    expect(madeQuests([MADE], ASKER, BEFORE, [TWO_STEPS.id])).toEqual([]);
  });

  it('holds none for another User, nor without members, nor with the User alone among them', () => {
    const [mine] = MADE.members ?? [];
    const kept = [MADE.id];

    expect(madeQuests([MADE], MINSU, BEFORE, kept)).toEqual([]);
    expect(madeQuests([{ ...MADE, members: undefined }], ASKER, BEFORE, kept)).toEqual([]);
    expect(madeQuests([{ ...MADE, members: mine === undefined ? [] : [mine] }], ASKER, BEFORE, kept)).toEqual([]);
  });

  it('holds none that is not Closed, nor a Class Quest', () => {
    expect(madeQuests([{ ...MADE, joinPolicy: 'open', board: 'meal' }], ASKER, BEFORE, [MADE.id])).toEqual([]);
    expect(madeQuests([{ ...MADE, classQuest: true }], ASKER, BEFORE, [MADE.id])).toEqual([]);
  });

  it('takes the last step, the meal, after the meeting step, and lists the Quests by that start', () => {
    const made = madeQuests([TWO_STEPS, MADE], ASKER, BEFORE, [MADE.id, TWO_STEPS.id]);

    expect(made.map(({ destination }) => destination.step.title)).toEqual([
      '302동식당에서 식사',
      '학생회관식당에서 식사',
    ]);
    expect(made[1]?.destination.at).toEqual({ latitude: 37.45932, longitude: 126.95058 });
  });
});

// Partitions of the end: one minute before the meal's end; at its end; the step marked ended by the server; the meal
// cancelled. Of the kept ids: a Quest there and not ended; gone; ended by the server; ended by the clock.
describe('a Quest made from a Plan that ended', () => {
  it('is held until its meal ends by the clock, and not from its end on', () => {
    expect(madeQuests([MADE], ASKER, new Date('2026-11-17T03:42:00.000Z'), [MADE.id])).toHaveLength(1);
    expect(madeQuests([MADE], ASKER, new Date('2026-11-17T03:43:00.000Z'), [MADE.id])).toEqual([]);
  });

  it('is not held once the server says its meal ended, or that it was cancelled', () => {
    const ended = steps(MADE, (step) => ({ ...step, ended: true }));
    const cancelled = steps(MADE, (step) => ({ ...step, cancelled: true }));

    expect(madeQuests([ended], ASKER, BEFORE, [MADE.id])).toEqual([]);
    expect(madeQuests([cancelled], ASKER, BEFORE, [MADE.id])).toEqual([]);
  });

  it("gives the kept ids the phone no longer needs: a Quest gone from the User's Quests, or ended", () => {
    const ended = steps(MADE, (step) => ({ ...step, ended: true }));
    const ids = [MADE.id, TWO_STEPS.id];

    expect(endedIds([MADE, TWO_STEPS], ids, BEFORE)).toEqual([]);
    expect(endedIds([MADE], ids, BEFORE)).toEqual([TWO_STEPS.id]);
    expect(endedIds([ended, TWO_STEPS], ids, BEFORE)).toEqual([MADE.id]);
    expect(endedIds([MADE, TWO_STEPS], ids, new Date('2026-11-17T03:43:00.000Z'))).toEqual([MADE.id]);
  });
});

// Partitions: nobody accepted; accepted; late counts as in; a decline stays among those invited; the destination today,
// tomorrow, and a later day; a title without "에서"; the meal cancelled, so that the flag stands at the meeting step.
// Expected values: the design's "12:33 점심 · 수락 1/2", the stored Quest's 12:15 and its title "302동식당에서 점심",
// which the server writes as the Plan's, and the day as the Quest's own card says it ("내일", "11월 17일 (화)").
describe("a made Quest's words", () => {
  it('say the start, the meal, and that nobody accepted yet', () => {
    expect(flagWords(onlyMade(MADE), standings('invited'))).toBe('12:15 점심 · 수락 0/1');
  });

  it('count a Friend who accepted or is late, out of every Friend invited, a decline included', () => {
    const made = onlyMade(MADE);

    expect(flagWords(made, standings('accepted'))).toBe('12:15 점심 · 수락 1/1');
    expect(flagWords(made, standings('late'))).toBe('12:15 점심 · 수락 1/1');
    expect(flagWords(made, standings('declined'))).toBe('12:15 점심 · 수락 0/1');
  });

  it('say the day before the start when the destination is not today', () => {
    const dayBefore = new Date('2026-11-16T02:50:00.000Z');
    const weekBefore = new Date('2026-11-10T02:50:00.000Z');

    expect(flagWords(onlyMade(MADE, dayBefore), standings('invited'))).toBe('내일 12:15 점심 · 수락 0/1');
    expect(flagWords(onlyMade(MADE, weekBefore), standings('invited'))).toBe('11월 17일 (화) 12:15 점심 · 수락 0/1');
  });

  it('say the whole title when it has no "에서", as the stored card\'s "점심"', () => {
    expect(flagWords(onlyMade(TWO_STEPS), standings('invited'))).toBe('12:33 점심 · 수락 0/1');
  });

  it("stand at the meeting step and say that step's title once the meal was cancelled", () => {
    // Changed for the boundary: the meal, the stored card's second step, is cancelled.
    const withoutMeal = steps(TWO_STEPS, (step, index) => (index === 1 ? { ...step, cancelled: true } : step));
    const made = onlyMade(withoutMeal);

    expect(made.destination.step.title).toBe('유상, 민수: 301동 앞에서 만나기');
    expect(flagWords(made, standings('invited'))).toBe('12:18 유상, 민수: 301동 앞에서 만나기 · 수락 0/1');
  });
});
