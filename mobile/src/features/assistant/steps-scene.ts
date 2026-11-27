/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, LibrarySpace, MapScene, Plan, ReplyStep } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { koreaClock, koreaDayWord } from '@/korea-time';
import { seatWords } from '@/library/cards/bookings';
import type { Slot } from '@/library/cards/payloads';
import { clockOf, minutesOf } from '@/library/cards/times';
import type { Draft } from './answer-groups';
import { bookingTitle } from './booking-scene';
import { meAndWalk } from './proposal-scene';
import { turnOf } from './turn';
import type { ChatBubble } from './use-chat';

// The requests of the turn on screen, when its reply answered two or more (P03's steps), which the map draws as
// numbered flags (P04 ticket 09).
export interface ShownSteps {
  bubbleId: number;
  steps: readonly ReplyStep[];
}

// The app's own bubbles after the reply, a booking's done message, 예약 안 함, or a card it adds, keep the steps, as
// they keep the booking (P10 ticket 29); a reply of the Assistant or a new turn ends them.
export function shownStepsOf(bubbles: readonly ChatBubble[]): ShownSteps | null {
  const [reply, ...later] = turnOf(bubbles)?.after ?? [];
  const steps = reply?.steps;
  return reply === undefined || steps === undefined || steps.length < 2 || later.some(({ own }) => own !== true)
    ? null
    : { bubbleId: reply.id, steps };
}

// What the steps are drawn over now (P10 ticket 29): the reply's answer, the answer on screen and its Plan, and the
// booking card on screen with the time it holds.
export interface StepsNow {
  reply: AnswerReply | null;
  answer: AnswerReply | null;
  plan: Plan | null;
  index: number;
  card: { key: string; slot: Slot } | null;
}

// The answer's step at the Plan on screen, as the main server makes it of a Plan (`answerStep`), or not done with the
// answer's reasons once it has none.
function answerStepAt(step: ReplyStep, answer: AnswerReply, plan: Plan | null): ReplyStep {
  if (plan === null) {
    const reasons = (answer.noPlan?.lines ?? []).map((line) => line.map(({ text }) => text).join('')).join(' ');
    return { ...step, place: null, from: null, endAt: null, status: 'not-done', reason: reasons || step.reason };
  }
  const from = plan.parts[0]?.origin?.place ?? step.from;
  const { title, place, startAt, endAt } = plan;
  return { ...step, title, place, from, startAt, endAt, status: 'shown', reason: null };
}

// A card's slot on its day in Korea, as the main server writes a step's times; a library's day ends before midnight.
function slotStretch({ date, start, minutes }: Slot): Pick<ReplyStep, 'startAt' | 'endAt'> {
  const end = clockOf(minutesOf(start) + minutes);
  return { startAt: `${date}T${start}:00+09:00`, endAt: `${date}T${end}:00+09:00` };
}

// The steps as they stand now (P10 ticket 29). The reply's steps are the main server's of the moment it answered: the
// answer's step is of the reply's first Plan, and a booking's of the time its card offered. Once the Plan on screen is
// another, a candidate browsed or an answer recalculated by a band moved or Friends added, the answer's step is drawn at
// it; a booking's step is drawn at the time its card holds. Drawn over the reply's steps until steps carry their own
// answers.
export function liveStepsOf(shown: ShownSteps, now: StepsNow): ShownSteps {
  const { reply, answer, plan, index, card } = now;
  const moved = answer !== null && (answer !== reply || index !== 0);
  const steps = shown.steps.map((step) => {
    if (step.shows?.kind === 'answer') {
      return moved ? answerStepAt(step, answer, plan) : step;
    }
    if (card === null || step.shows?.kind !== 'card' || step.shows.key !== card.key || step.status !== 'shown') {
      return step;
    }
    const held = slotStretch(card.slot);
    return held.startAt === step.startAt && held.endAt === step.endAt ? step : { ...step, ...held };
  });
  return steps.every((step, at) => step === shown.steps[at]) ? shown : { ...shown, steps };
}

export const STEP_ID = 'answer:step:';

// The number of the step a mark of the map is, from 1; null for any other mark.
export function stepNumberOf(id: string): number | null {
  return id.startsWith(STEP_ID) ? Number(id.slice(STEP_ID.length)) : null;
}

function over(step: ReplyStep, now: Date): boolean {
  const end = step.endAt ?? step.startAt;
  return end !== null && Date.parse(end) <= now.getTime();
}

// The step due first: the earliest one done and not yet over, by its index; the first when every one is over.
export function dueStepOf(steps: readonly ReplyStep[], now: Date): number {
  const due = steps.findIndex((step) => step.status === 'shown' && !over(step, now));
  return Math.max(due, 0);
}

// "17:30–19:00", or "19:04" for a step with no end.
export function stepClock({ startAt, endAt }: Pick<ReplyStep, 'startAt' | 'endAt'>): string | null {
  if (startAt === null) {
    return null;
  }
  return endAt === null ? koreaClock(startAt) : `${koreaClock(startAt)}–${koreaClock(endAt)}`;
}

// A step's flag title: a booking's room, by its card's space when the card is on screen, else the step's place.
export function stepTitle(step: ReplyStep, space: LibrarySpace | null): string {
  if (step.kind === 'seat' || step.kind === 'room') {
    return space === null ? step.title : bookingTitle(space);
  }
  return step.place?.label ?? step.title;
}

// A step's flag line: the seat for the step due when its card offers one, the day word when it is not today, and its
// time, then "예약됨" once its booking is made, as a lone booking's label says (P10 ticket 29); a step not done says
// so.
export function stepLine(step: ReplyStep, seat: string | null, now: Date, booked = false): string {
  if (step.status === 'not-done') {
    return '못 했어요';
  }
  const day = step.startAt === null ? '' : koreaDayWord(step.startAt, now);
  const line = [seat === null ? '' : seatWords(seat), day, stepClock(step) ?? ''].filter((words) => words !== '');
  return booked ? `${line.join(' ')} · 예약됨` : line.join(' ');
}

// The User at `me` with a walk to the first step with a place, then a way from each step with a place to the next.
export function stepsScene(steps: readonly ReplyStep[], me: LatLng | null): MapScene {
  const points = steps.flatMap(({ place }) => (place === null ? [] : [place]));
  const [first] = points;
  if (first === undefined) {
    return { people: [], places: [], routes: [], flags: [] };
  }
  const { mine, walk } = meAndWalk(me, { latitude: first.latitude, longitude: first.longitude });
  const between = points.slice(1).map((to, at) => {
    const from = points[at] ?? first;
    return {
      userId: 'me',
      role: 'me' as const,
      from: { latitude: from.latitude, longitude: from.longitude },
      to: { latitude: to.latitude, longitude: to.longitude },
      minutes: 0,
    };
  });
  return { people: mine, places: [], routes: [...walk, ...between], flags: [] };
}

// Each step with a place as a numbered flag: ① ② by the steps' order, its title with "›" when a press does something,
// its line, and faded when it was not done.
export function stepDrafts(
  steps: readonly ReplyStep[],
  lines: readonly string[],
  titles: readonly string[],
  // Whether a press on each step's flag does something, which its "›" says; left out, every one.
  opens: readonly boolean[] = [],
): Draft[] {
  return steps.flatMap((step, index): Draft[] => {
    const { place } = step;
    if (place === null) {
      return [];
    }
    const number = index + 1;
    const done = step.status === 'shown';
    const title = (opens[index] ?? true) ? `${titles[index] ?? step.title} ›` : (titles[index] ?? step.title);
    const line = lines[index] ?? null;
    return [
      {
        id: `${STEP_ID}${String(number)}`,
        name: `${String(number)} ${title} · ${line ?? ''}`,
        position: { latitude: place.latitude, longitude: place.longitude },
        planId: null,
        group: done ? 'pick' : 'dropped',
        symbol: { type: 'dot', role: done ? 'pick' : 'dropped', number },
        tone: done ? 'pick' : 'dropped',
        title,
        line,
        number,
      },
    ];
  });
}
