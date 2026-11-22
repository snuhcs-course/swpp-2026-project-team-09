/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { SHORTEST_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import { type AnswerLine, type DroppedPlace, type PlanPart } from '../dto/answer.dto.js';
import { clockOf, onDay } from '../free-time/free-time.js';
import { type Interval, latest } from '../free-time/meal-fit.js';
import { koreaTime } from '../korea-time.js';
import { type GatheringNaming, itemAt, modeOf, withTopic } from './answer-words.js';
import { type GatheringDrop, MINUTE_MS, type PersonPart } from './gathering.js';

// Each person's part of a gathering, a meal's or a meet's, and the words of the Place the User fixed when it does not
// fit ("여기면 어때?"): who stays there shortest, and why.

const SHORTEST_MINUTES = SHORTEST_MEAL_SECONDS / 60;

const timeOf = (at: Date | null): string | null => (at === null ? null : koreaTime(at));

const plain = (text: string): AnswerLine => [{ text, strong: false }];

export function partOf(part: PersonPart, naming: GatheringNaming): PlanPart {
  const { userId, name, me } = naming.personOf(part.personId);
  const { origin, next } = part;
  return {
    userId,
    name,
    me,
    origin: origin === null ? null : { place: naming.placePoint(origin.placeId), basis: origin.basis },
    leaveAt: timeOf(part.leaveAt),
    walkMinutes: part.walkMinutes,
    arriveAt: timeOf(part.canArriveAt),
    leaveBy: timeOf(part.leaveBy),
    next:
      next === null
        ? null
        : {
            startAt: koreaTime(next.start),
            place: next.placeId === null ? null : naming.placePoint(next.placeId),
            ...(next.by === 'shuttle' ? { by: 'shuttle' as const } : {}),
          },
    ...modeOf(part),
    ...(part.shuttle === null ? {} : { shuttle: part.shuttle }),
  };
}

// The Places that do not fit, the one the User fixed with each person's part there.
export function droppedOf(naming: GatheringNaming): DroppedPlace[] {
  const { gathering, input } = naming.args;
  return gathering.dropped.map((drop) => {
    const dropped: DroppedPlace = {
      place: naming.labelledPoint(drop.placeId, drop.key),
      reason: naming.dropReason(drop),
    };
    if (drop.placeId === input.placeId) {
      dropped.parts = drop.parts.map((part) => partOf(part, naming));
    }
    return dropped;
  });
}

// What the people gather for (점심, 만남) and what they do for the minutes they stay (먹어요, 있을 수 있어요).
export interface StayWords {
  word: string;
  stay: string;
}

const arrivalOf = ({ canArriveAt, readyAt }: PersonPart): Date => canArriveAt ?? readyAt;

function topicOf(part: PersonPart, naming: GatheringNaming): string {
  const { me, name } = naming.personOf(part.personId);
  return withTopic(me ? '나' : name);
}

// What ends a person's stay: their next item, the leave-by the User fixed for them, the end the User fixed, or the
// hours of the gathering or of the Restaurant, as `ownEnd` says them.
function leaveLine(part: PersonPart, naming: GatheringNaming, window: Interval, ownEnd: string): string {
  const { leaveBy, next } = part;
  if (leaveBy !== null && leaveBy <= window.end) {
    const ownLeaveBy = next === null ? null : next.start.getTime() - (next.walkMinutes ?? 0) * MINUTE_MS;
    if (next === null || ownLeaveBy !== leaveBy.getTime()) {
      return `${clockOf(leaveBy)}엔 나서야 해요`;
    }
    const isClass = itemAt(naming.personOf(part.personId).items, next)?.isClass === true;
    return `${clockOf(next.start)} ${isClass ? '수업' : '일정'}에 가려면 ${clockOf(leaveBy)}엔 나서야 해요`;
  }
  const { date, window: fixed } = naming.args.input;
  const fixedEnd = fixed.until !== null && onDay(date, fixed.until).getTime() === window.end.getTime();
  return fixedEnd ? `${clockOf(window.end)}까지로 정했어요` : ownEnd;
}

// The one who cannot stay long enough even alone: from when, for how long, and what makes them leave. The asker is
// not named.
function shortestLines(
  drop: GatheringDrop,
  part: PersonPart,
  naming: GatheringNaming,
  window: Interval,
  words: StayWords,
): AnswerLine[] {
  const who = naming.personOf(part.personId).me ? '' : `${topicOf(part, naming)} `;
  const { minutes } = drop.shortest;
  const from = clockOf(latest([window.start, arrivalOf(part)]));
  const arrives = part.canArriveAt !== null && part.canArriveAt >= window.start;
  let first: string;
  if (minutes > 0) {
    first = arrives
      ? `${who}${from}에 도착해 ${minutes}분만 ${words.stay}`
      : `${who}${from}부터 ${minutes}분만 ${words.stay}`;
  } else {
    // An arrival is timed only when it is known and is why there is no time.
    first = arrives ? `${who}${from}에야 도착해요` : `${who}시간이 안 돼요`;
  }
  const close = clockOf(window.end);
  const ownEnd =
    drop.window === undefined
      ? `${withTopic(words.word)} ${close}까지예요`
      : `${withTopic(drop.key)} ${close}에 닫아요`;
  return [plain(first), plain(leaveLine(part, naming, window, ownEnd))];
}

// Everyone could stay long enough alone but not together: one arrives after the other must leave, or nearly.
function togetherLines(drop: GatheringDrop, naming: GatheringNaming, window: Interval): AnswerLine[] {
  const leaving = (part: PersonPart): Date => part.leaveBy ?? window.end;
  const last = drop.parts.reduce((one, other) => (arrivalOf(other) > arrivalOf(one) ? other : one));
  const first = drop.parts.reduce((one, other) => (leaving(other) < leaving(one) ? other : one));
  const when = clockOf(arrivalOf(last));
  // One whose position is unknown is not said to arrive.
  const coming = last.canArriveAt === null ? `${when}부터 시간이 되고` : `${when}에 도착하고`;
  return [
    plain(naming.dropReason(drop)),
    plain(`${topicOf(last, naming)} ${coming} ${topicOf(first, naming)} ${clockOf(leaving(first))}엔 나서야 해요`),
  ];
}

// The lines of the Place the User fixed when it does not fit, over the window it was fitted in: its own hours, else
// the gathering's `window`. Null when the input fixed no Place or that Place was not dropped.
export function unfitLines(naming: GatheringNaming, window: Interval, words: StayWords): AnswerLine[] | null {
  const { input, gathering } = naming.args;
  const drop = gathering.dropped.find(({ placeId }) => placeId === input.placeId);
  if (drop === undefined) {
    return null;
  }
  const held = drop.window ?? window;
  const shortest = drop.parts.find(({ personId }) => personId === drop.shortest.personId);
  return shortest !== undefined && drop.shortest.minutes < SHORTEST_MINUTES
    ? shortestLines(drop, shortest, naming, held, words)
    : togetherLines(drop, naming, held);
}
