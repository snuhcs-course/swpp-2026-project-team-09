/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RecruitingQuestDto } from '../../quests/dto/quest.dto.js';
import {
  type AnswerLine,
  type AnswerReply,
  type DroppedPlace,
  type Plan,
  type QuestsInput,
} from '../dto/answer.dto.js';
import { chipsOf, leaveByWords, partOf, plain } from '../events/event-answer.js';
import { type Way } from '../events/event-fit.js';
import { bandOf, byWord, EventNaming, type NamingArgs, sceneOf } from '../events/event-scene.js';
import { clockOf } from '../free-time/free-time.js';
import { withSubject } from '../gathering/answer-words.js';
import { koreaTime } from '../korea-time.js';
import { type QuestDrop, type QuestDropReason, type QuestPlan, type QuestPlanning } from './quest-fit.js';

// The words of the recruiting Quests the asker could join: what the app draws and writes for each plan. Nothing here is
// sent to the model.

export interface QuestAnswerArgs extends NamingArgs {
  input: QuestsInput;
  planning: QuestPlanning;
  // Each Quest as the recruiting list gives it, by its id.
  listed: ReadonlyMap<string, RecruitingQuestDto>;
}

type Naming = EventNaming<QuestAnswerArgs>;

// A way there, and when to set out on it.
export const setOutWords = (from: string, to: string, way: Way, leaveAt: Date): string =>
  `${from}에서 ${to}까지 ${byWord(way)} ${way.minutes}분, ${clockOf(leaveAt)}에 나서요`;

// Where and when, and when to set out; with a Friend among the Holders, who is there.
function linesOf({ event, start, leaveAt, quest }: QuestPlan, naming: Naming): AnswerLine[] {
  const where = { text: `${clockOf(start)} ${naming.eventWords(event)}`, strong: true };
  if (quest.friendNames.length > 0) {
    return [[where, { text: ' 파티에', strong: false }], plain(`${withSubject(quest.friendNames.join(', '))} 있어요`)];
  }
  return [[where, ...(leaveAt === null ? [] : [{ text: ` · ${clockOf(leaveAt)}에 나서요`, strong: false }])]];
}

// The way there and when to set out, the way on, and why the asker leaves when the next item cuts the stay.
function basisOf({ event, origin, there, leaveAt, next, leaveBy, end }: QuestPlan, naming: Naming): string[] {
  const words = naming.eventWords(event);
  const lines: string[] = [];
  if (origin !== null && there !== null && leaveAt !== null && there.minutes > 0) {
    lines.push(setOutWords(naming.placeLabel(origin.placeId), words, there, leaveAt));
  }
  const nextPlaceId = next?.item.placeId ?? null;
  if (next !== null && next.way !== null && nextPlaceId !== null && next.way.minutes > 0) {
    lines.push(`${words}에서 ${naming.placeLabel(nextPlaceId)}까지 ${byWord(next.way)} ${next.way.minutes}분`);
  }
  if (next !== null && leaveBy !== null && leaveBy.getTime() === end.getTime()) {
    lines.push(leaveByWords(next.item, leaveBy));
  }
  return lines;
}

function planOf(plan: QuestPlan, naming: Naming): Plan {
  const { quest, event, start, end, stayMinutes } = plan;
  const listed = naming.args.listed.get(quest.id);
  if (listed === undefined) {
    throw new Error(`No listed Quest ${quest.id}`);
  }
  return {
    id: quest.id,
    title: quest.title,
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
    quest: listed,
    friendNames: quest.friendNames,
  };
}

function reasonOf(reason: QuestDropReason, start: Date): string {
  const clock = clockOf(start);
  if (reason.kind === 'started') {
    return `${clock} 파티 · 이미 시작했어요`;
  }
  return reason.kind === 'late'
    ? `${clock} 파티는 ${clockOf(reason.arriveAt)}에야 도착해요`
    : `${clock} 파티 · ${reason.minutes}분밖에 못 있어요`;
}

function droppedOf({ event, reason }: QuestDrop, naming: Naming): DroppedPlace {
  return { place: naming.eventPoint(event), reason: reasonOf(reason, event.start) };
}

export function questAnswer(args: QuestAnswerArgs): AnswerReply {
  const naming = new EventNaming(args);
  const { input, planning } = args;
  const plans = planning.plans.map((plan) => planOf(plan, naming));
  return {
    input,
    chips: chipsOf(planning.first, naming),
    plans,
    dropped: planning.dropped.map((drop) => droppedOf(drop, naming)),
    noPlan: plans.length > 0 ? null : { reason: 'no-fit', lines: [plain('제시간에 갈 수 있는 파티가 없어요')] },
  };
}
