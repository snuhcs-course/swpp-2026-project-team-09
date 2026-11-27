/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Plan } from '@/api/assistant-types';
import type { PlanQuest } from '@/api/plan-quest-types';
import type { Person } from '@/api/types';

// The reply of POST /plans for a meal's Plan of `meal-answer-alone.json` taken alone ("여기로", P05-14), as the main
// server makes it: a Quest the asker holds alone (capacity 1) for the meal, and the card's two lines. Each second line
// and leave-by is the main server's rule worked out by hand for that answer, asked at 11:50 with the Class at 24동 at
// 13:00: the walk to the Restaurant starts now, so the leave-by is the walk on to 24동 when it takes 5 minutes or more.
const SECOND: Record<string, { line: string; remindAt: string | null }> = {
  '301동식당': { line: '12:45에 나설 시각을 알려 드릴게요', remindAt: '2026-11-17T03:45:00.000Z' },
  학생회관식당: { line: '수업까지 1분이라 나설 알림은 없어요', remindAt: null },
  '3식당': { line: '12:54에 나설 시각을 알려 드릴게요', remindAt: '2026-11-17T03:54:00.000Z' },
  '302동식당': { line: '12:43에 나설 시각을 알려 드릴게요', remindAt: '2026-11-17T03:43:00.000Z' },
  '자하연식당 2층': { line: '12:55에 나설 시각을 알려 드릴게요', remindAt: '2026-11-17T03:55:00.000Z' },
};

const NOTHING_TOLD = { line: '오늘은 다음 일정이 없어 나설 알림은 없어요', remindAt: null };

// A study place of `study-plan-answer.ts` taken alone the same way (P10 ticket 19), studied at where the User is.
export function mealTakenAloneOf(plan: Plan, me: Person, stay: '먹어요' | '공부해요' = '먹어요'): PlanQuest {
  const { line, remindAt } = SECOND[plan.id] ?? NOTHING_TOLD;
  const there = plan.parts.find((part) => part.me)?.walkMinutes === 0;
  return {
    quest: {
      id: `taken-${plan.id}`,
      title: plan.title,
      globalEvent: null,
      leader: me,
      capacity: 1,
      joinPolicy: 'closed',
      takenAlone: true,
      board: null,
      description: '',
      createdAt: '2026-11-17T02:50:00.000Z',
      holders: [me],
      subQuests: [
        {
          id: `taken-step-${plan.id}`,
          attending: false,
          title: plan.title,
          startsAt: new Date(plan.startAt).toISOString(),
          endsAt: new Date(plan.endAt).toISOString(),
          place: plan.place,
          cancelled: false,
          completion: 'by_hand',
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
          { text: plan.place.label, strong: true },
          { text: there ? `에서 ${stay}` : '으로 가요', strong: false },
        ],
        [{ text: line, strong: false }],
      ],
      remindAt,
    },
  };
}
