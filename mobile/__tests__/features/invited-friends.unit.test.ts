/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { PlanQuest } from '@/api/plan-quest-types';
import type { QuestMember } from '@/api/types';
import { friendStandings, type HeardAnswer, standingWords } from '@/features/assistant/invited-friends';

const ME = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';
const JIEUN = 'a4c0f6de-2b7e-4c57-9d3a-5e8f1b2c7d90';
const QUEST_ID = PLAN_QUEST.quest.id;
const EARLY = 1_000;
const LATER = 2_000;

// The stored reply with a second invitation added for 지은, so that two Friends can stand apart.
const TWO_INVITED: PlanQuest = {
  ...PLAN_QUEST,
  invitations: [...PLAN_QUEST.invitations, { id: 'b1d0e4a2-7c1f-4d6b-9a8e-3f2c5d7e9a10', userId: JIEUN }],
};

function member(
  userId: string,
  name: string,
  state: QuestMember['state'],
  lateMinutes: number | null = null,
): QuestMember {
  return { user: { id: userId, name, department: '컴퓨터공학부' }, state, lateMinutes };
}

function signal(kind: HeardAnswer['kind'], userId: string, heardAt: number, questId = QUEST_ID): HeardAnswer {
  return { kind, questId, userId, heardAt };
}

// Partitions of the two words: neither; the members alone (the Friend listed, the Friend left out); a signal alone
// (for this Quest, for another); both, the signal later; both, the members later. Expected values: the P02 spec, "How
// each Friend stands": the latest word counts.
describe("each Friend's state after inviting", () => {
  it('is invited for every invitation of the reply when nothing else is known', () => {
    expect(friendStandings(PLAN_QUEST, null, [])).toEqual(new Map([[MINSU, { state: 'invited', lateMinutes: null }]]));
  });

  it("follows the Quest's members, and leaves out the User", () => {
    const members = [
      member(ME, '유상', 'accepted'),
      member(MINSU, '민수', 'late', 5),
      member(JIEUN, '지은', 'declined'),
    ];

    expect(friendStandings(TWO_INVITED, { members, readAt: EARLY }, [])).toEqual(
      new Map([
        [MINSU, { state: 'late', lateMinutes: 5 }],
        [JIEUN, { state: 'declined', lateMinutes: null }],
      ]),
    );
  });

  it('is dropped for a Friend whom the members leave out, with no signal', () => {
    const members = [member(ME, '유상', 'accepted'), member(MINSU, '민수', 'accepted')];

    expect(friendStandings(TWO_INVITED, { members, readAt: EARLY }, [])).toEqual(
      new Map([
        [MINSU, { state: 'accepted', lateMinutes: null }],
        [JIEUN, { state: 'dropped', lateMinutes: null }],
      ]),
    );
  });

  it("takes the latest signal for this Quest when no members are known, and none for another Quest's", () => {
    const heard = [
      signal('declined', MINSU, EARLY),
      signal('accepted', MINSU, LATER),
      signal('accepted', JIEUN, LATER, 'another-quest'),
    ];

    expect(friendStandings(TWO_INVITED, null, heard)).toEqual(
      new Map([
        [MINSU, { state: 'accepted', lateMinutes: null }],
        [JIEUN, { state: 'invited', lateMinutes: null }],
      ]),
    );
  });
});

// Partitions: the sequences of the review, each the order of a signal and a read of the members.
describe("each Friend's state by the latest word", () => {
  it('is late when a signal accepted and the members read later say late', () => {
    const read = { members: [member(MINSU, '민수', 'late', 5)], readAt: LATER };

    expect(friendStandings(PLAN_QUEST, read, [signal('accepted', MINSU, EARLY)])).toEqual(
      new Map([[MINSU, { state: 'late', lateMinutes: 5 }]]),
    );
  });

  it('is dropped when a signal accepted and the members read later leave the Friend out', () => {
    const read = { members: [member(ME, '유상', 'accepted')], readAt: LATER };

    expect(friendStandings(PLAN_QUEST, read, [signal('accepted', MINSU, EARLY)])).toEqual(
      new Map([[MINSU, { state: 'dropped', lateMinutes: null }]]),
    );
  });

  it('is declined when the members read first say invited and a decline is heard after', () => {
    const read = { members: [member(MINSU, '민수', 'invited')], readAt: EARLY };

    expect(friendStandings(PLAN_QUEST, read, [signal('declined', MINSU, LATER)])).toEqual(
      new Map([[MINSU, { state: 'declined', lateMinutes: null }]]),
    );
  });
});

// Partitions: each of the five states. Expected values: the P02 spec's chips.
describe("a Friend's state in words", () => {
  it.each([
    [{ state: 'invited', lateMinutes: null }, '아직 안 봄'],
    [{ state: 'accepted', lateMinutes: null }, '수락'],
    [{ state: 'declined', lateMinutes: null }, '거절'],
    [{ state: 'late', lateMinutes: 5 }, '5분 늦음'],
    [{ state: 'dropped', lateMinutes: null }, '빠짐'],
  ] as const)('reads %o as "%s"', (standing, words) => {
    expect(standingWords(standing)).toBe(words);
  });
});
