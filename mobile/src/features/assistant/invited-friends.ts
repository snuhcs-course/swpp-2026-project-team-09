/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanQuest } from '@/api/plan-quest-types';
import type { QuestMember } from '@/api/types';
import type { InvitationAnswer } from '@/live/invitation-answers';

export type Standing = Pick<QuestMember, 'state' | 'lateMinutes'>;

const INVITED: Standing = { state: 'invited', lateMinutes: null };

// How each invited Friend of a Quest made from a Plan stands, by user id: by the last signal heard for this Quest,
// else by the Quest's members, else invited, as the reply made them.
export function friendStandings(
  made: PlanQuest,
  members: readonly QuestMember[] | undefined,
  heard: readonly InvitationAnswer[],
): Map<string, Standing> {
  return new Map(
    made.invitations.map(({ userId }): [string, Standing] => {
      const signal = heard.findLast((one) => one.questId === made.quest.id && one.userId === userId);
      if (signal !== undefined) {
        return [userId, { state: signal.kind, lateMinutes: null }];
      }
      const member = members?.find(({ user }) => user.id === userId);
      return [userId, member === undefined ? INVITED : { state: member.state, lateMinutes: member.lateMinutes }];
    }),
  );
}

// What a person's chip says of the state after the name.
export function standingWords({ state, lateMinutes }: Standing): string {
  if (state === 'late') {
    return `${lateMinutes ?? 0}분 늦음`;
  }
  return { invited: '아직 안 봄', accepted: '수락', declined: '거절' }[state];
}
