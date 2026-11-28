/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Prisma } from '../../generated/prisma/client.js';
import { type HeldMeal, heldMealOf, type InvitedMeal, invitedMealOf } from '../../quests/held-meal.js';
import { type AnswerReply, type MealInput } from '../dto/answer.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { withTopic } from './answer-words.js';
import { koreaTime } from '../korea-time.js';

// Friends added to the meal the asker already holds (P05 ticket 44): asked for with everyone in it and someone new, the
// meal is planned again at its Restaurant and from its start, and 바꾸기 (`PUT /plans/:questId`) invites the new ones
// to the same Quest. Adding someone never moves the meal unless the User presses the button that says so.

export interface Adding {
  // The Friends the plan adds, in the order asked.
  friendIds: string[];
  // The meal's own step: where and when the people in it eat.
  placeId: string;
  startsAt: Date;
  // The Restaurant, by the Quest's title ("302동식당" of "302동식당에서 점심").
  key: string;
}

// A Friend asked for who is already in the meal held, or invited to it and not yet answered.
export interface AlreadyIn {
  name: string;
  answer: 'in' | 'invited';
}

// The Restaurant of a meal Quest's title.
export const restaurantOf = (title: string): string => title.replace(/에서 (점심|저녁)$/u, '');

const friendIdsOf = ({ people }: Pick<MealInput, 'people'>): string[] => people.slice(1).map(({ userId }) => userId);

// The Friends the input adds to the held meal, when it asks for everyone in it and someone more; null otherwise.
export function addingTo(held: HeldMeal | null, input: Pick<MealInput, 'people'>): Adding | null {
  const placeId = held?.meal.placeId ?? null;
  if (held === null || placeId === null) {
    return null;
  }
  const asked = friendIdsOf(input);
  const added = asked.filter((id) => !held.otherIds.includes(id));
  if (added.length === 0 || !held.otherIds.every((id) => asked.includes(id))) {
    return null;
  }
  return { friendIds: added, placeId, startsAt: held.meal.startsAt, key: restaurantOf(held.title) };
}

// The input planned at the held meal's Place, from its start: everyone is there by then, or the plan starts later.
export const pinnedTo = (input: MealInput, { placeId, startsAt }: Adding): MealInput => ({
  ...input,
  placeId,
  window: { from: clockOf(startsAt), until: null },
});

// The Friends the input adds to the held meal, and the input as it is planned: pinned to the meal when it adds any.
export function addingOf(held: HeldMeal | null, input: MealInput): { adding: Adding | null; asked: MealInput } {
  const adding = addingTo(held, input);
  return { adding, asked: adding === null ? input : pinnedTo(input, adding) };
}

// The open Restaurants at the Place asked for, any without one; adding to a meal held, only its Restaurant.
export function candidatesOf<Open extends { key: string; placeId: string }>(
  open: readonly Open[],
  placeId: string | null,
  adding: Adding | null,
): Open[] {
  const there = placeId === null ? [...open] : open.filter((each) => each.placeId === placeId);
  return adding === null ? there : there.filter(({ key }) => key === adding.key);
}

// The input with everyone of the held meal in it, before the Friends the User asked for that are new to it, when the
// User asked for any: a meal held with others is never planned beside, so asking for a Friend adds them to it. Each
// person keeps the constraints the input gave them.
export function withItsPeople(input: MealInput, held: HeldMeal | null): MealInput {
  const asked = friendIdsOf(input);
  if (held === null || asked.every((id) => held.otherIds.includes(id))) {
    return input;
  }
  const [asker, ...friends] = input.people;
  if (asker === undefined) {
    return input;
  }
  const kept = (userId: string): MealInput['people'][number] =>
    friends.find((person) => person.userId === userId) ?? { userId, constraints: [] };
  const added = friends.filter(({ userId }) => !held.otherIds.includes(userId));
  return { ...input, people: [asker, ...held.otherIds.map((id) => kept(id)), ...added] };
}

// The answer when no plan has the Friends added in it (P05 ticket 85): the meal as it is held, planned for everyone in it
// but them, and why there was no plan as its note, which names them ("지호는 이 점심에 시간이 안 돼요" when the reasons
// do not). The app then still offers the press that invites them, and 그대로 두기, beside why they cannot join it,
// rather than the reasons alone over the whole meal's time. An answer with a plan, or one adding nobody, is as it was;
// so is one whose meal cannot be planned as it is held either.
export function asHeld(
  answer: AnswerReply,
  {
    adding,
    people,
    meal,
  }: { adding: Adding | null; people: readonly { userId: string; name: string }[]; meal: MealInput['meal'] },
  answerOf: (kept: (userId: string) => boolean) => AnswerReply,
): AnswerReply {
  if (adding === null || answer.plans.length > 0) {
    return answer;
  }
  const { plans } = answerOf((userId) => !adding.friendIds.includes(userId));
  if (plans.length === 0) {
    return answer;
  }
  const names = people.filter(({ userId }) => adding.friendIds.includes(userId)).map(({ name }) => name);
  const reasons = (answer.noPlan?.lines ?? []).map((line) => line.map(({ text }) => text).join(''));
  const named = reasons.some((reason) => names.some((name) => reason.includes(name)));
  const why = named
    ? reasons
    : [`${withTopic(names.join(', '))} 이 ${meal === 'lunch' ? '점심' : '저녁'}에 시간이 안 돼요`];
  const note = [...why, ...(answer.note === undefined ? [] : [answer.note])].join('\n');
  return { ...answer, plans, noPlan: null, note };
}

// What a meal's answer is planned of for only the people `kept`, the asker always among them: the input, the people of
// the answer, and the people of the gathering, in the same order.
export function keptOnly<Person extends { userId: string }, Gathered extends { id: string }>(
  kept: (userId: string) => boolean,
  {
    input,
    people,
    persons,
  }: { input: MealInput; people: readonly [Person, ...Person[]]; persons: readonly [Gathered, ...Gathered[]] },
): { input: MealInput; people: [Person, ...Person[]]; persons: [Gathered, ...Gathered[]] } {
  const [asker, ...friends] = people;
  const [askerPerson, ...friendPersons] = persons;
  return {
    input: { ...input, people: input.people.filter(({ userId }, index) => index === 0 || kept(userId)) },
    people: [asker, ...friends.filter(({ userId }) => kept(userId))],
    persons: [askerPerson, ...friendPersons.filter(({ id }) => kept(id))],
  };
}

// What the app reads of the Friends the plan adds: who, the meal's start, and the start the first plan moves it to,
// null when it keeps it or there is no plan. Nothing when the plan adds nobody.
export function addingDto(
  adding: Adding | null,
  people: readonly { userId: string; name: string }[],
  plans: AnswerReply['plans'],
): Pick<AnswerReply, 'adding'> {
  if (adding === null) {
    return {};
  }
  const [first] = plans;
  const moves = first !== undefined && new Date(first.startAt).getTime() !== adding.startsAt.getTime();
  const nameOf = (userId: string): string => people.find((person) => person.userId === userId)?.name ?? '';
  const friends = adding.friendIds.map((userId) => ({ userId, name: nameOf(userId) }));
  return { adding: { friends, startAt: koreaTime(adding.startsAt), movesTo: moves ? first.startAt : null } };
}

// What planMeal plans of the User's words: the input with the people of the meal held (`withItsPeople`) and the Friends
// asked for who are in it or invited already; or, for a User who holds no such meal but was invited to one and asked
// for a Friend, that meal, of which nothing is planned.
export type Asked = { input: MealInput; alreadyIn: AlreadyIn[] } | { invited: InvitedMeal };

export async function askedFor(
  db: Pick<Prisma.TransactionClient, 'quest'>,
  askerId: string,
  input: MealInput,
): Promise<Asked> {
  const held = await heldMealOf(db, askerId, input);
  const friendIds = friendIdsOf(input);
  const invited = held === null && friendIds.length > 0 ? await invitedMealOf(db, askerId, input) : null;
  if (invited !== null) {
    return { invited };
  }
  const alreadyIn = (held?.otherIds ?? []).flatMap((id, index): AlreadyIn[] =>
    friendIds.includes(id)
      ? [{ name: held?.others[index] ?? '', answer: held?.invitedIds.includes(id) === true ? 'invited' : 'in' }]
      : [],
  );
  return { input: withItsPeople(input, held), alreadyIn };
}
