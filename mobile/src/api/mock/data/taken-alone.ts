/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Plan } from '@/api/assistant-types';
import type { PlanQuest } from '@/api/plan-quest-types';
import type { Person } from '@/api/types';

// The reply of POST /plans for an events Plan of `events-answer.ts` taken alone ("여기로", P03 ticket 15), as the main
// server makes it: a Quest taken alone (capacity 1) for the event, and the card's two lines. Each second line
// and leave-by is the main server's rule worked out by hand for that answer, asked at 13:50: the job fair's walk on to
// the 15:30 Class at 301동 (18 minutes, leave at 15:12); the concert's way there by shuttle (leave at 17:42); the
// company session's way there of 4 minutes, with nothing after it.
const SECOND: Record<string, { line: string; remindAt: string | null }> = {
  '42b86020-4f3a-42e0-9efb-8a60e66a7d0b': {
    line: '15:12에 나설 시각을 알려 드릴게요',
    remindAt: '2026-11-20T06:12:00.000Z',
  },
  '06b0d7bf-98aa-4d49-a22c-4c06d135891c': {
    line: '17:42에 나설 시각을 알려 드릴게요',
    remindAt: '2026-11-20T08:42:00.000Z',
  },
  'c750f9a0-887e-4dc1-99d1-34b065ff6257': { line: '오늘은 다음 일정이 없어 나설 알림은 없어요', remindAt: null },
};

const NOTHING_TOLD = { line: '오늘은 다음 일정이 없어 나설 알림은 없어요', remindAt: null };

export function takenAloneOf(plan: Plan, me: Person): PlanQuest {
  const { line, remindAt } = SECOND[plan.id] ?? NOTHING_TOLD;
  return {
    quest: {
      id: `taken-${plan.id}`,
      title: plan.title,
      globalEvent: { id: plan.id, title: plan.title },
      leader: me,
      capacity: 1,
      takenAlone: true,
      joinPolicy: 'closed',
      board: null,
      description: '',
      createdAt: '2026-11-20T04:50:00.000Z',
      holders: [me],
      subQuests: [
        {
          id: `taken-step-${plan.id}`,
          attending: true,
          title: plan.title,
          startsAt: new Date(plan.startAt).toISOString(),
          endsAt: new Date(plan.endAt).toISOString(),
          place: plan.place,
          cancelled: false,
          completion: 'by_time',
          done: false,
          ended: false,
        },
      ],
      classQuest: false,
      waitingJoinRequests: 0,
      members: [{ user: me, state: 'accepted', lateMinutes: null }],
    },
    invitations: [],
    askLevels: [],
    alone: {
      lines: [
        [
          { text: plan.title, strong: true },
          { text: '에 가요', strong: false },
        ],
        [{ text: line, strong: false }],
      ],
      remindAt,
    },
  };
}
