/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { Quest, QuestMember, SubQuest } from '@/api/types';
import type { Standing } from '@/features/assistant/invited-friends';
import { flagWords, type MadeQuest, madeQuests } from '@/features/assistant/made-quests';

const ASKER = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';
const JIEUN = 'a4c0f6de-2b7e-4c57-9d3a-5e8f1b2c7d90';
// Before the stored Quest's meal on Tuesday 2026-11-17, which runs from 12:15 to 12:43 in Korea.
const BEFORE = new Date('2026-11-17T02:50:00.000Z');
const MADE = PLAN_QUEST.quest;
const MEAL = MADE.subQuests[0];

function member(id: string, name: string, state: QuestMember['state']): QuestMember {
  return { user: { id, name, department: '컴퓨터공학부' }, state, lateMinutes: state === 'late' ? 5 : null };
}

// The Quest of the stored invitation card as its Leader reads it: the meeting at 301동 from 12:18 and the meal at the
// Student Center from 12:33, each step with the fields of a Sub Quest that the stored reply's step has. 지은 is invited
// beside 민수, as in the worked example.
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
  members: [member(ASKER, '유상', 'accepted'), member(MINSU, '민수', 'invited'), member(JIEUN, '지은', 'invited')],
};

function standings(...states: [string, Standing['state']][]): Map<string, Standing> {
  return new Map(states.map(([id, state]) => [id, { state, lateMinutes: state === 'late' ? 5 : null }]));
}

// `quest` as a Quest made from a Plan that the asker waits on, before its meal.
function onlyMade(quest: Quest): MadeQuest {
  const [made] = madeQuests([quest], ASKER, BEFORE);
  if (made === undefined) {
    throw new Error('No Quest made from a Plan');
  }
  return made;
}

// Partitions: the stored reply's Quest for its Leader; another User; no members known; members of the User alone; a
// Quest that is not Closed; a Class Quest; two steps, the meal last. Expected values: package C's spec, "A Plan becomes a
// Quest" (the asker leads it, Closed, its steps the Plan's with the meal last, an invitation for every Friend).
describe('the Quests made from a Plan', () => {
  it('holds the stored Quest for its Leader, at its one step, with 민수 invited', () => {
    const [made] = madeQuests([MADE], ASKER, BEFORE);

    expect(made?.quest).toBe(MADE);
    expect(made?.destination).toEqual({
      step: MEAL,
      startsAt: '2026-11-17T03:15:00.000Z',
      at: { latitude: 37.44887, longitude: 126.95265 },
    });
    expect(made?.friends.map(({ name }) => name)).toEqual(['민수']);
  });

  it('holds none for another User, nor without members, nor with the User alone among them', () => {
    expect(madeQuests([MADE], MINSU, BEFORE)).toEqual([]);
    expect(madeQuests([{ ...MADE, members: undefined }], ASKER, BEFORE)).toEqual([]);
    expect(madeQuests([{ ...MADE, members: [member(ASKER, '유상', 'accepted')] }], ASKER, BEFORE)).toEqual([]);
  });

  it('holds none that is not Closed, nor a Class Quest', () => {
    expect(madeQuests([{ ...MADE, joinPolicy: 'open', board: 'meal' }], ASKER, BEFORE)).toEqual([]);
    expect(madeQuests([{ ...MADE, classQuest: true }], ASKER, BEFORE)).toEqual([]);
  });

  it('takes the last step, the meal, after the meeting step, and lists the Quests by that start', () => {
    const made = madeQuests([TWO_STEPS, MADE], ASKER, BEFORE);

    expect(made.map(({ destination }) => destination.step.title)).toEqual([
      '302동식당에서 식사',
      '학생회관식당에서 식사',
    ]);
    expect(made[1]?.destination.at).toEqual({ latitude: 37.45932, longitude: 126.95058 });
  });
});

// Partitions of the end: one minute before the meal's end; at its end; the step marked ended by the server; the meal
// cancelled.
describe('a Quest made from a Plan that ended', () => {
  it('is held until its meal ends by the clock, and not from its end on', () => {
    expect(madeQuests([MADE], ASKER, new Date('2026-11-17T03:42:00.000Z'))).toHaveLength(1);
    expect(madeQuests([MADE], ASKER, new Date('2026-11-17T03:43:00.000Z'))).toEqual([]);
  });

  it('is not held once the server says its meal ended, or that it was cancelled', () => {
    expect(madeQuests([{ ...MADE, subQuests: [{ ...MEAL, ended: true }] }], ASKER, BEFORE)).toEqual([]);
    expect(madeQuests([{ ...MADE, subQuests: [{ ...MEAL, cancelled: true }] }], ASKER, BEFORE)).toEqual([]);
  });
});

// Partitions: nobody accepted; one of two accepted; late counts as in; a decline stays among those invited; a title
// without "에서". Expected values: the design's "12:33 점심 · 수락 1/2", and the stored Quest's 12:15 and its title
// "302동식당에서 점심", which the server writes as the Plan's.
describe("a made Quest's words", () => {
  it('say the start, the meal, and that nobody accepted yet', () => {
    expect(flagWords(onlyMade(MADE), standings([MINSU, 'invited']))).toBe('12:15 점심 · 수락 0/1');
  });

  it('count a Friend who accepted or is late, out of every Friend invited, a decline included', () => {
    const made = onlyMade(TWO_STEPS);

    expect(flagWords(made, standings([MINSU, 'accepted'], [JIEUN, 'invited']))).toBe('12:33 점심 · 수락 1/2');
    expect(flagWords(made, standings([MINSU, 'late'], [JIEUN, 'declined']))).toBe('12:33 점심 · 수락 1/2');
  });
});
