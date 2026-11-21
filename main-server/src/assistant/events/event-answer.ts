/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AnswerLine,
  type AnswerReply,
  type ConditionChip,
  type DroppedPlace,
  type Plan,
  type PlanPart,
} from '../dto/answer.dto.js';
import { clockOf, type DayItem } from '../free-time/free-time.js';
import { withAnd } from '../gathering/answer-words.js';
import { koreaDate, koreaTime } from '../korea-time.js';
import { type EventDrop, type EventPlan, type EventPlanning } from './event-fit.js';
import {
  bandOf,
  byWord,
  type EventAnswerArgs,
  EventNaming,
  eventTimes,
  itemWord,
  modeOf,
  type NamingArgs,
  sceneOf,
} from './event-scene.js';

export { type EventAnswerArgs } from './event-scene.js';

// The words of the Global Events of a day the asker can attend: what the app draws and writes for each plan. Nothing
// here is sent to the model.

const timeOf = (at: Date | null): string | null => (at === null ? null : koreaTime(at));

export const plain = (text: string): AnswerLine => [{ text, strong: false }];

// Why the asker leaves when the next item cuts the stay.
export const leaveByWords = (next: DayItem, leaveBy: Date): string =>
  `${clockOf(next.start)} ${itemWord(next)}이라 ${clockOf(leaveBy)}엔 나서요`;

// Where the asker sets out from and the item that ends that stretch.
export function chipsOf(first: EventPlanning['first'], naming: EventNaming<NamingArgs>): ConditionChip[] {
  const origin = first?.origin ?? null;
  const next = first?.next ?? null;
  const chips: ConditionChip[] = [];
  if (origin !== null) {
    chips.push({ kind: 'origin', text: `${naming.placeLabel(origin.placeId)}에서`, userId: null });
  }
  if (next !== null) {
    const clock = clockOf(next.start);
    chips.push({ kind: 'until', text: next.isClass ? `${clock} 수업까지` : `${clock}까지`, userId: null });
  }
  return chips;
}

export function partOf(
  { origin, there, leaveAt, leaveBy, next }: EventPlan,
  naming: EventNaming<NamingArgs>,
): PlanPart {
  const { userId, name } = naming.args.asker;
  const nextPlaceId = next?.item.placeId ?? null;
  return {
    userId,
    name,
    me: true,
    origin: origin === null ? null : { place: naming.placePoint(origin.placeId), basis: origin.basis },
    leaveAt: timeOf(leaveAt),
    walkMinutes: there?.minutes ?? null,
    leaveBy: timeOf(leaveBy),
    next:
      next === null
        ? null
        : { startAt: koreaTime(next.item.start), place: nextPlaceId === null ? null : naming.placePoint(nextPlaceId) },
    ...modeOf(there),
  };
}

// Under way: the event, its place and its own times, then when the asker arrives and how long they can stay, and why
// they leave when the next item cuts the stay.
// Not started: its start, and when they set out. A clash: its start and place, and the item it lies over.
function linesOf(plan: EventPlan, naming: EventNaming): AnswerLine[] {
  const { state, event, start, end, stayMinutes, there, leaveAt, leaveBy, next, clash } = plan;
  if (state === 'clash' && clash !== null) {
    const first: AnswerLine = [
      { text: event.title, strong: true },
      { text: ` · ${clockOf(start)} ${naming.eventWords(event)}`, strong: false },
    ];
    return [first, plain(`${clockOf(clash.start)} ${withAnd(itemWord(clash))} 겹쳐요`)];
  }
  if (state === 'not-started') {
    const first: AnswerLine = [
      { text: event.title, strong: true },
      { text: ` · ${clockOf(event.start)} 시작`, strong: false },
    ];
    if (leaveAt === null || there === null) {
      return [first];
    }
    const clock = clockOf(leaveAt);
    return [first, plain(there.mode === 'shuttle' ? `${clock}에 셔틀로 가요` : `${clock}에 나서면 돼요`)];
  }
  const first: AnswerLine = [
    { text: event.title, strong: true },
    { text: ` · ${naming.eventWords(event)} ${eventTimes(event)}`, strong: false },
  ];
  const arriving: AnswerLine = [
    { text: `${clockOf(start)} 도착`, strong: true },
    { text: ` · ${stayMinutes}분 볼 수 있어요`, strong: false },
  ];
  if (next === null || leaveBy === null || leaveBy.getTime() !== end.getTime()) {
    return [first, arriving];
  }
  return [first, arriving, plain(leaveByWords(next.item, leaveBy))];
}

// The event's place and times, the way there, then the way on to the next item.
function basisOf({ event, origin, there, next }: EventPlan, naming: EventNaming): string[] {
  const words = naming.eventWords(event);
  const lines: string[] = [`${event.title} · ${words} ${eventTimes(event)}`];
  if (origin !== null && there !== null && there.minutes > 0) {
    lines.push(`${naming.placeLabel(origin.placeId)}에서 ${words}까지 ${byWord(there)} ${there.minutes}분`);
  }
  const nextPlaceId = next?.item.placeId ?? null;
  if (next !== null && next.way !== null && nextPlaceId !== null && next.way.minutes > 0) {
    lines.push(`${words}에서 ${naming.placeLabel(nextPlaceId)}까지 ${byWord(next.way)} ${next.way.minutes}분`);
  }
  return lines;
}

function planOf(plan: EventPlan, naming: EventNaming): Plan {
  const { event, start, end, stayMinutes } = plan;
  return {
    id: event.id,
    title: event.title,
    place: naming.eventPoint(event),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    togetherMinutes: stayMinutes,
    meeting: null,
    parts: [partOf(plan, naming)],
    subQuests: [],
    lines: linesOf(plan, naming),
    basis: basisOf(plan, naming),
    scene: sceneOf(plan, naming),
    band: bandOf(plan, naming),
  };
}

function droppedOf({ event, reason }: EventDrop, naming: EventNaming): DroppedPlace {
  const why = reason.kind === 'late' ? `${clockOf(reason.arriveAt)}에야 도착해요` : `${reason.minutes}분밖에 못 있어요`;
  return { place: naming.eventPoint(event), reason: `${event.title} · ${why}` };
}

export function eventAnswer(args: EventAnswerArgs): AnswerReply {
  const naming = new EventNaming(args);
  const { input, now, planning } = args;
  const plans = planning.plans.map((plan) => planOf(plan, naming));
  const day = input.date === koreaDate(now) ? '오늘은' : '그날은';
  return {
    input,
    chips: chipsOf(planning.first, naming),
    plans,
    dropped: planning.dropped.map((drop) => droppedOf(drop, naming)),
    noPlan: plans.length > 0 ? null : { reason: 'no-fit', lines: [plain(`${day} 다녀올 만한 행사가 없어요`)] },
  };
}
