/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibrarySpace, MapScene, ReplyStep } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { koreaClock, koreaDayWord } from '@/korea-time';
import { seatWords } from '@/library/cards/bookings';
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

export function shownStepsOf(bubbles: readonly ChatBubble[]): ShownSteps | null {
  const after = turnOf(bubbles)?.after ?? [];
  const [reply] = after;
  const steps = reply?.steps;
  return after.length !== 1 || reply === undefined || steps === undefined || steps.length < 2
    ? null
    : { bubbleId: reply.id, steps };
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
// time; a step not done says so.
export function stepLine(step: ReplyStep, seat: string | null, now: Date): string {
  if (step.status === 'not-done') {
    return '못 했어요';
  }
  const day = step.startAt === null ? '' : koreaDayWord(step.startAt, now);
  return [seat === null ? '' : seatWords(seat), day, stepClock(step) ?? ''].filter((words) => words !== '').join(' ');
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
