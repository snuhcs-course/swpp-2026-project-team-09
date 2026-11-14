/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanQuest } from '@/api/plan-quest-types';
import type { MemberState, QuestMember } from '@/api/types';
import type { InvitationAnswer } from '@/live/invitation-answers';

// 'dropped': the Quest's members are known and the Friend is not among them (left, or the invitation was taken back).
export interface Standing {
  state: MemberState | 'dropped';
  lateMinutes: number | null;
}

export const NO_STANDINGS: ReadonlyMap<string, Standing> = new Map();

// A signal heard for a Quest, with when it was heard (milliseconds since the epoch).
export interface HeardAnswer extends InvitationAnswer {
  heardAt: number;
}

// The Quest's members as the User's Quests last held them, with when they were read.
export interface ReadMembers {
  members: readonly QuestMember[];
  readAt: number;
}

const INVITED: Standing = { state: 'invited', lateMinutes: null };
const DROPPED: Standing = { state: 'dropped', lateMinutes: null };

// How each invited Friend of a Quest made from a Plan stands, by user id: the latest word counts, a signal heard for
// this Quest after the members were read, else the members, else invited, as the reply made them.
export function friendStandings(
  made: PlanQuest,
  read: ReadMembers | null,
  heard: readonly HeardAnswer[],
): Map<string, Standing> {
  return new Map(
    made.invitations.map(({ userId }): [string, Standing] => {
      const signal = heard.findLast((one) => one.questId === made.quest.id && one.userId === userId);
      if (signal !== undefined && (read === null || signal.heardAt > read.readAt)) {
        return [userId, { state: signal.kind, lateMinutes: null }];
      }
      if (read === null) {
        return [userId, INVITED];
      }
      const member = read.members.find(({ user }) => user.id === userId);
      return [userId, member === undefined ? DROPPED : { state: member.state, lateMinutes: member.lateMinutes }];
    }),
  );
}

// What a person's chip says of the state after the name.
export function standingWords({ state, lateMinutes }: Standing): string {
  if (state === 'late') {
    return `${lateMinutes ?? 0}분 늦음`;
  }
  return { invited: '아직 안 봄', accepted: '수락', declined: '거절', dropped: '빠짐' }[state];
}
