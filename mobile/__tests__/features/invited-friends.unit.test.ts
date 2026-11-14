/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { PlanQuest } from '@/api/plan-quest-types';
import type { QuestMember } from '@/api/types';
import { friendStandings, standingWords } from '@/features/assistant/invited-friends';

const ME = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';
const JIEUN = 'a4c0f6de-2b7e-4c57-9d3a-5e8f1b2c7d90';
const QUEST_ID = PLAN_QUEST.quest.id;

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

// Partitions of the sources: the reply alone; the Quest's members; a signal for this Quest; a signal for another
// Quest; a signal and members that disagree (the signal first); members that leave a Friend out. Expected values: the
// P02 spec, "How each Friend stands".
describe("each Friend's state after inviting", () => {
  it('is invited for every invitation of the reply when nothing else is known', () => {
    expect(friendStandings(PLAN_QUEST, undefined, [])).toEqual(
      new Map([[MINSU, { state: 'invited', lateMinutes: null }]]),
    );
  });

  it("follows the Quest's members, and leaves out the User", () => {
    const members = [
      member(ME, '유상', 'accepted'),
      member(MINSU, '민수', 'late', 5),
      member(JIEUN, '지은', 'declined'),
    ];

    expect(friendStandings(TWO_INVITED, members, [])).toEqual(
      new Map([
        [MINSU, { state: 'late', lateMinutes: 5 }],
        [JIEUN, { state: 'declined', lateMinutes: null }],
      ]),
    );
  });

  it('keeps invited a Friend whom the members leave out', () => {
    expect(
      friendStandings(TWO_INVITED, [member(ME, '유상', 'accepted'), member(MINSU, '민수', 'accepted')], []),
    ).toEqual(
      new Map([
        [MINSU, { state: 'accepted', lateMinutes: null }],
        [JIEUN, { state: 'invited', lateMinutes: null }],
      ]),
    );
  });

  it("takes a signal for this Quest before the members, the later signal over the earlier, and none for another's", () => {
    const members = [member(MINSU, '민수', 'invited'), member(JIEUN, '지은', 'invited')];
    const heard = [
      { kind: 'declined', questId: QUEST_ID, userId: MINSU },
      { kind: 'accepted', questId: QUEST_ID, userId: MINSU },
      { kind: 'accepted', questId: 'another-quest', userId: JIEUN },
    ] as const;

    expect(friendStandings(TWO_INVITED, members, heard)).toEqual(
      new Map([
        [MINSU, { state: 'accepted', lateMinutes: null }],
        [JIEUN, { state: 'invited', lateMinutes: null }],
      ]),
    );
  });
});

// Partitions: each of the four states. Expected values: the P02 spec's chips.
describe("a Friend's state in words", () => {
  it.each([
    [{ state: 'invited', lateMinutes: null }, '아직 안 봄'],
    [{ state: 'accepted', lateMinutes: null }, '수락'],
    [{ state: 'declined', lateMinutes: null }, '거절'],
    [{ state: 'late', lateMinutes: 5 }, '5분 늦음'],
  ] as const)('reads %o as "%s"', (standing, words) => {
    expect(standingWords(standing)).toBe(words);
  });
});
