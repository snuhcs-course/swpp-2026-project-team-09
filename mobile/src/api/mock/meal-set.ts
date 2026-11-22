/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply, KeptQuest, MealSet } from '@/api/assistant-types';
import type { MemberState, Quest } from '@/api/types';
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

const ANSWERS: Record<MemberState, KeptQuest['people'][number]['answer']> = {
  invited: 'waiting',
  accepted: 'accepted',
  late: 'accepted',
  declined: 'declined',
};

// The same lunch as the main server names it since P05 ticket 17, with where it is (ticket 28): its first step's point,
// named as the line names the Restaurant.
function planSetOf(quest: Quest, { startAt, place, shared }: MealSet): KeptQuest {
  const at = quest.subQuests[0]?.place ?? null;
  const { placeId = null, latitude = null, longitude = null } = at ?? {};
  const point =
    placeId === null || latitude === null || longitude === null ? null : { placeId, label: place, latitude, longitude };
  const people = (quest.members ?? [])
    .filter(({ user }) => user.id !== ME.id)
    .map(({ user, state }) => ({ name: user.name, answer: ANSWERS[state] }));
  return {
    kind: 'meal-lunch',
    questId: quest.id,
    title: quest.title,
    startAt,
    endAt: null,
    place,
    point,
    people,
    mine: true,
    changeable: !shared,
  };
}

// The main server's line beside it: change it here, or in its 파티 when it is shared.
function lineOf({ startAt, place, friendNames, shared }: MealSet): string {
  const at = `${koreaClock(startAt)} ${place} 점심이 있어요.`;
  return shared ? `이미 ${friendNames.join(', ')}와 ${at} 바꾸려면 그 파티에서 바꿔 주세요.` : `이미 ${at} 바꿀까요?`;
}

// The mock's meal answer beside a lunch the User holds: the plans as they are, the lunch named both ways, and the line.
export function withMealSet(reply: AssistantReply, quests: readonly Quest[]): AssistantReply {
  const mealSet = mealSetOf(quests);
  const quest = quests.find(({ id }) => id === mealSet?.questId);
  if (mealSet === null || quest === undefined || reply.answer === null || reply.answer === undefined) {
    return reply;
  }
  const planSet = planSetOf(quest, mealSet);
  return { ...reply, text: lineOf(mealSet), answer: { ...reply.answer, mealSet, planSet } };
}
