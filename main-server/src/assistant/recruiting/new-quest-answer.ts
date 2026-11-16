/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AnswerLine,
  type AnswerReply,
  type ConditionChip,
  type NewQuestInput,
  type Plan,
  type PlanPart,
} from '../dto/answer.dto.js';
import { type EventPlan } from '../events/event-fit.js';
import { chipsOf, leaveByWords, partOf, plain } from '../events/event-answer.js';
import { bandOf, EventNaming, itemWord, modeOf, type NamingArgs, sceneOf } from '../events/event-scene.js';
import { clockOf, type FreeInterval } from '../free-time/free-time.js';
import { type AnswerPerson, withSubject, withToward } from '../gathering/answer-words.js';
import { koreaTime } from '../korea-time.js';
import { type NewQuestPlanning, type PersonWay } from './new-quest-fit.js';
import { setOutWords } from './quest-answer.js';

// The words of a new recruiting Quest: what the app draws and writes for its plan, and the steps the Quest is made
// with. Nothing here is sent to the model.

export interface NewQuestAnswerArgs extends NamingArgs {
  input: NewQuestInput;
  // Everyone of the plan, the asker first.
  people: readonly AnswerPerson[];
  // The asker's other Friends who could come.
  others: readonly AnswerPerson[];
  planning: NewQuestPlanning;
  title: string;
  placeId: string;
  // The Global Event's words for its place, else the Place's name.
  placeWords: string;
  // The Global Event's own times, null for an activity.
  event: { start: Date; end: Date | null } | null;
}

type Naming = EventNaming<NewQuestAnswerArgs>;

// A Quest has room for this many unless its plan has more people.
export const CAPACITY_MIN = 4;

// The asker's part of the plan, as an event's plan, to draw it as one.
function askerPlan({ args }: Naming): EventPlan {
  const { planning, title, placeId, placeWords } = args;
  const { start, end, minutes } = planning;
  const [way] = planning.ways;
  return {
    event: { id: placeId, title, start, end, placeId, place: placeWords },
    state: 'not-started',
    start,
    end,
    stayMinutes: minutes,
    origin: way?.origin ?? null,
    there: way?.there ?? null,
    leaveAt: way?.leaveAt ?? null,
    next: way?.next ?? null,
    leaveBy: way?.leaveBy ?? null,
    clash: null,
  };
}

const personOf = ({ args }: Naming, userId: string): AnswerPerson => {
  const person = args.people.find((each) => each.userId === userId);
  if (person === undefined) {
    throw new Error(`No person ${userId} in the plan`);
  }
  return person;
};

const time = (at: Date | null): string | null => (at === null ? null : koreaTime(at));

function friendPart({ userId, origin, there, leaveAt, leaveBy, next }: PersonWay, naming: Naming): PlanPart {
  const nextPlaceId = next?.item.placeId ?? null;
  return {
    userId,
    name: personOf(naming, userId).name,
    me: false,
    origin: origin === null ? null : { place: naming.placePoint(origin.placeId), basis: origin.basis },
    leaveAt: time(leaveAt),
    walkMinutes: there?.minutes ?? null,
    leaveBy: time(leaveBy),
    next:
      next === null
        ? null
        : { startAt: koreaTime(next.item.start), place: nextPlaceId === null ? null : naming.placePoint(nextPlaceId) },
    ...modeOf(there),
  };
}

// With Friends, everyone meets at the Place; then the Global Event until the asker must leave, or the activity.
function subQuestsOf(plan: EventPlan, naming: Naming): Plan['subQuests'] {
  const { title, placeId, placeWords, people, input, event } = naming.args;
  const at = koreaTime(plan.start);
  const meeting = { at, placeId, title: `${people.map(({ name }) => name).join(', ')}: ${placeWords} 앞에서 만나기` };
  const { next, leaveBy, end } = plan;
  const cut = input.globalEventId !== null && next !== null && leaveBy !== null && leaveBy.getTime() === end.getTime();
  const nextPlaceId = next?.item.placeId ?? null;
  const onward = nextPlaceId === null ? '' : ` · ${withToward(naming.placeLabel(nextPlaceId))} 나서기`;
  const step = { at, placeId, title: cut ? `${clockOf(end)}까지 ${title}${onward}` : title };
  // From the event's own start and not cut short, the step is the event itself, which the Quest's attending Sub Quest
  // already is.
  const steps = event !== null && !cut && plan.start.getTime() === event.start.getTime() ? [] : [step];
  return people.length > 1 ? [meeting, ...steps] : steps;
}

// Where and when, posted for how many; and whose arrival set the time, when it was not said.
function linesOf(plan: EventPlan, naming: Naming): AnswerLine[] {
  const { planning, people, placeWords } = naming.args;
  const capacity = Math.max(CAPACITY_MIN, people.length);
  const first: AnswerLine = [
    { text: `${clockOf(plan.start)} ${placeWords}`, strong: true },
    { text: ` · ${capacity}명 공개 모집`, strong: false },
  ];
  const { decidedBy } = planning;
  if (decidedBy === null) {
    return [first];
  }
  const who =
    decidedBy.userId === naming.args.asker.userId ? '' : `${withSubject(personOf(naming, decidedBy.userId).name)} `;
  return [first, plain(`${who}${clockOf(decidedBy.arriveAt)}에 도착해서 ${clockOf(plan.start)}에 모여요`)];
}

// Each person's way and when they set out, then why the asker leaves when the next item cuts the stay.
function basisOf(plan: EventPlan, naming: Naming): string[] {
  const { planning, placeWords, asker } = naming.args;
  const lines = planning.ways.flatMap(({ userId, origin, there, leaveAt }) => {
    if (origin === null || there === null || leaveAt === null || there.minutes === 0) {
      return [];
    }
    const words = setOutWords(naming.placeLabel(origin.placeId), placeWords, there, leaveAt);
    return [userId === asker.userId ? words : `${personOf(naming, userId).name} · ${words}`];
  });
  const { next, leaveBy, end } = plan;
  return next !== null && leaveBy !== null && leaveBy.getTime() === end.getTime()
    ? [...lines, leaveByWords(next.item, leaveBy)]
    : lines;
}

// What the screen shows of a Friend who could come: what of their day ends or starts around then.
function dayWords({ previous, next }: FreeInterval, naming: Naming): string {
  if (previous !== null) {
    const where = previous.placeId === null ? '' : `${naming.placeLabel(previous.placeId)} `;
    return `${clockOf(previous.end)} ${where}${itemWord(previous)} 끝`;
  }
  return next === null ? '일정이 없어요' : `${clockOf(next.start)} ${itemWord(next)} 전까지 비어 있어요`;
}

function candidatesOf(naming: Naming): NonNullable<Plan['candidates']> {
  const { planning, others } = naming.args;
  return planning.candidates.flatMap(({ userId, stretch }) => {
    const other = others.find((each) => each.userId === userId);
    return other === undefined
      ? []
      : [{ userId, name: other.name, line: `${other.name} · ${dayWords(stretch, naming)}` }];
  });
}

function sceneWithFriends(plan: EventPlan, naming: Naming): Plan['scene'] {
  const scene = sceneOf(plan, naming);
  const to = naming.position(plan.event.placeId);
  for (const { userId, origin, there } of naming.args.planning.ways.slice(1)) {
    if (origin !== null) {
      const { name } = personOf(naming, userId);
      const from = naming.position(origin.placeId);
      const minutes = there?.minutes ?? 0;
      scene.people.push({
        userId,
        name,
        me: false,
        at: from,
        source: 'timetable',
        tag: minutes > 0 ? `${name} · ${minutes}분` : name,
      });
      if (minutes > 0) {
        scene.routes.push({ userId, role: 'friend', from, to, minutes, ...modeOf(there) });
      }
    }
  }
  return scene;
}

function planOf(naming: Naming): Plan {
  const plan = askerPlan(naming);
  const { args } = naming;
  return {
    id: args.placeId,
    title: args.title,
    place: naming.eventPoint(plan.event),
    startAt: koreaTime(plan.start),
    endAt: koreaTime(plan.end),
    togetherMinutes: plan.stayMinutes,
    meeting: null,
    parts: [partOf(plan, naming), ...args.planning.ways.slice(1).map((way) => friendPart(way, naming))],
    subQuests: subQuestsOf(plan, naming),
    lines: linesOf(plan, naming),
    basis: basisOf(plan, naming),
    scene: sceneWithFriends(plan, naming),
    band: bandOf(plan, naming, args.people.slice(1)),
    candidates: candidatesOf(naming),
  };
}

function chipsWithFriends(naming: Naming): ConditionChip[] {
  const [mine, ...theirs] = naming.args.planning.ways;
  const chips = chipsOf(mine === undefined ? null : { origin: mine.origin, next: mine.next?.item ?? null }, naming);
  for (const { userId, origin } of theirs) {
    const { name } = personOf(naming, userId);
    chips.push({ kind: 'person', text: origin === null ? `${name} · 자리 모름` : name, userId });
  }
  return chips;
}

export function newQuestAnswer(args: NewQuestAnswerArgs): AnswerReply {
  const naming = new EventNaming(args);
  const plans = args.planning.fits ? [planOf(naming)] : [];
  return {
    input: args.input,
    chips: chipsWithFriends(naming),
    plans,
    dropped: [],
    noPlan: plans.length > 0 ? null : { reason: 'no-fit', lines: [plain('그 시간엔 모일 수 없어요')] },
  };
}
