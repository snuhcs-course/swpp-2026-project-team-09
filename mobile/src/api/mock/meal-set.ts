/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply, MealSet } from '@/api/assistant-types';
import type { Quest } from '@/api/types';
import { koreaClock } from '@/korea-time';
import { ME } from './data/frame';

// The Restaurant a made meal's title names ("302동식당에서 점심").
function placeOf(title: string): string {
  return title.replace(/에서 (점심|저녁|식사)$/u, '');
}

// The lunch the mock's User holds, made from a meal's Plan, as the main server names it (P05 ticket 16); null for none.
function mealSetOf(quests: readonly Quest[]): MealSet | null {
  const quest = quests.find(({ subQuests }) => subQuests.length > 0);
  const startsAt = quest?.subQuests[0]?.startsAt ?? null;
  if (quest === undefined || startsAt === null) {
    return null;
  }
  const friendNames = (quest.members ?? [])
    .map(({ user }) => user)
    .filter(({ id }) => id !== ME.id)
    .map(({ name }) => name);
  return {
    questId: quest.id,
    title: quest.title,
    startAt: startsAt,
    place: placeOf(quest.title),
    friendNames,
    shared: quest.takenAlone !== true,
  };
}

// The main server's line beside it: change it here, or in its 파티 when it is shared.
function lineOf({ startAt, place, friendNames, shared }: MealSet): string {
  const at = `${koreaClock(startAt)} ${place} 점심이 있어요.`;
  return shared ? `이미 ${friendNames.join(', ')}와 ${at} 바꾸려면 그 파티에서 바꿔 주세요.` : `이미 ${at} 바꿀까요?`;
}

// The mock's meal answer beside a lunch the User holds: the plans as they are, the lunch named, and the line.
export function withMealSet(reply: AssistantReply, quests: readonly Quest[]): AssistantReply {
  const mealSet = mealSetOf(quests);
  if (mealSet === null || reply.answer === null || reply.answer === undefined) {
    return reply;
  }
  return { ...reply, text: lineOf(mealSet), answer: { ...reply.answer, mealSet } };
}
