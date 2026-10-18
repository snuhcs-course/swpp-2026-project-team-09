/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { PAST_PLANS, type PastPlan } from '@/api/mock/data/past-quests';
import type { Person, Quest } from '@/api/types';
import { koreaInstant } from '@/korea-time';

// The mock adapter for the User's past Quests, in both builds: the main server keeps no ended Quest, and these state
// nothing about a real Quest (P06 spec, Mocks). Dated back from `now`, so that they stay past. Replaced once the main
// server lists the User's ended Quests.

function questOf(plan: PastPlan, me: Person, now: Date): Quest {
  const startsAt = koreaInstant(now, -plan.daysAgo, plan.hour, plan.minute).toISOString();
  const [leader = me] = plan.others;
  return {
    id: plan.id,
    title: plan.title,
    globalEvent: null,
    leader,
    capacity: plan.capacity,
    joinPolicy: plan.joinPolicy,
    holders: [...plan.others, me],
    subQuests: [
      {
        id: `${plan.id}-1`,
        attending: true,
        title: plan.title,
        startsAt,
        endsAt: null,
        place: { placeId: null, label: plan.place, latitude: null, longitude: null },
        completion: 'by_time',
        cancelled: false,
        done: true,
        ended: true,
      },
    ],
    classQuest: false,
    waitingJoinRequests: 0,
    board: plan.joinPolicy === 'closed' ? null : 'hobby',
    description: '',
    createdAt: startsAt,
  };
}

export function pastQuestsOf(me: Person, now: Date): Quest[] {
  return PAST_PLANS.map((plan) => questOf(plan, me, now));
}
