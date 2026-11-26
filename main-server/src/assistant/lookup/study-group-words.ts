/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type Plan, type StudyGroup } from '../dto/answer.dto.js';
import { hasFinal } from '../gathering/answer-words.js';
import { addDays } from '../library/booking-rules.js';
import { type StudyDatePick } from '../library/study-pick.js';
import { monthDayWords } from '../library/study-room.js';
import { othersText } from '../others-text.js';

// What the model is told of a study answer together (P10 ticket 07), and its one sentence: "네 명이 모두 비는 내일
// 15:00에 관정 4층 6인실을 추천해요.", or, below the fewest a room takes, how many more to call.

const COUNTS = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟'];

// "네 명".
const countWords = (people: number): string => `${COUNTS[people] ?? String(people)} 명`;

const clockOf = (time: string): string => time.slice(11, 16);

// "오늘", "내일", "모레", else "12월 2일".
export function studyDayWords(date: string, today: string): string {
  const near = [today, addDays(today, 1), addDays(today, 2)].indexOf(date);
  return ['오늘', '내일', '모레'][near] ?? monthDayWords(date);
}

const roomWords = ({ room }: StudyGroup): string => `관정 ${room.floor}층 ${room.name}`;

export function groupSentence(plan: Plan, group: StudyGroup): string {
  if (group.moreNeeded > 0) {
    const more = group.moreNeeded === 1 ? '한 명만' : countWords(group.moreNeeded);
    return `그룹스터디룸은 ${countWords(group.people + group.moreNeeded)}부터예요. ${more} 더 부르면 돼요.`;
  }
  const date = plan.startAt.slice(0, 10);
  const room = roomWords(group);
  const pick = `${countWords(group.people)}이 모두 비는 ${studyDayWords(date, plan.band.now.slice(0, 10))} ${clockOf(plan.startAt)}에 ${room}${hasFinal(room) ? '을' : '를'} 추천해요.`;
  return group.opens === null ? pick : `${pick} ${monthDayWords(date)} 방은 ${group.opens}부터 예약할 수 있어요.`;
}

function otherDaysOf(others: readonly StudyDatePick[]): object {
  return {
    otherDays: others.flatMap(({ booking }) =>
      booking === null
        ? []
        : [{ date: booking.date, start: booking.start, end: booking.end, shortestMinutes: booking.shortestMinutes }],
    ),
    noBookingOn: others.flatMap(({ date, booking }) => (booking === null ? [date] : [])),
  };
}

// The plan in words for the model: the room, the day and time, each person's stay, and the other days of a period; or
// why there is none.
export function studyGroupWords(answer: AnswerReply, others: readonly StudyDatePick[]): object {
  const [plan] = answer.plans;
  const group = plan?.study?.group;
  if (answer.noPlan !== null || plan === undefined || group === undefined) {
    const reason = (answer.noPlan?.lines ?? []).map((line) => line.map(({ text }) => text).join('')).join(' ');
    return { result: 'none', reason };
  }
  return {
    result: 'planned',
    why: groupSentence(plan, group),
    room: roomWords(group),
    date: plan.startAt.slice(0, 10),
    start: clockOf(plan.startAt),
    end: clockOf(plan.endAt),
    people: plan.parts.map(({ me, name, arriveAt, leaveBy }) => ({
      name: me ? '나' : othersText('friend.name', name),
      from: arriveAt === null || arriveAt === undefined ? null : clockOf(arriveAt),
      leavesAt: leaveBy === null ? null : clockOf(leaveBy),
    })),
    moreNeeded: group.moreNeeded,
    ...(group.opens === null ? {} : { windowOpens: group.opens }),
    ...otherDaysOf(others),
  };
}
