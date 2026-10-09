// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import type { BadgeTone } from '@/design-system';
import type { Meetup, MeetupState, Meetups } from '@/api/waiting-types';
import { koreaClock, koreaDay } from '@/korea-time';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const SENT_STATE: Record<Exclude<MeetupState, 'withdrawn'>, { label: string; tone: BadgeTone }> = {
  proposed: { label: '응답 대기', tone: 'warning' },
  accepted: { label: '수락함', tone: 'live' },
  declined: { label: '거절함', tone: 'neutral' },
  expired: { label: '기간 지남', tone: 'neutral' },
};

// "내일 12:10 · 학생회관", "내일 12:10–13:00 · 학생회관": when, as the date·time sheet reads it, and where.
export function meetupMeta({ startsAt, endsAt, place }: Meetup, now: Date): string {
  const end = endsAt === null ? '' : `–${koreaClock(endsAt)}`;
  const when = `${koreaDay(startsAt, now)} ${koreaClock(startsAt)}${end}`;
  return place === null ? when : `${when} · ${place.label}`;
}

// The Meetups under 초대: those proposed to the User that wait for an answer, and those the User proposed, but for the
// withdrawn ones and those whose start passed more than seven days ago. Both in the main server's order.
export function invitesOf({ received, sent }: Meetups, now: Date): { received: Meetup[]; sent: Meetup[] } {
  return {
    received: received.filter(({ state }) => state === 'proposed'),
    sent: sent.filter(
      ({ state, startsAt }) => state !== 'withdrawn' && Date.parse(startsAt) >= now.getTime() - WEEK_MS,
    ),
  };
}
