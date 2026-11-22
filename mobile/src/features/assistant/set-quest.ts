/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, KeptQuest } from '@/api/assistant-types';
import { koreaClock } from '@/korea-time';

// A Quest the User already holds that an answer stands beside (P04 ticket 17): what it is, when and where, with whom,
// whether others share it, whether this answer may change it, and whether 바꾸기 changes it in place (a meeting,
// `PUT /plans/{questId}`) or makes the answer's Plan in its place (a meal, `POST /plans`). One shape for every
// planner's answer: the main server's `planSet` first, else a meal answer's `mealSet` of a server before it.
export interface SetQuest {
  questId: string;
  title: string;
  // Korea time with the offset.
  startAt: string;
  place: string;
  // The others' names.
  people: string[];
  // Another holds it or is invited: it is changed in its 파티, not here.
  shared: boolean;
  // 바꾸기 makes the answer's Plan the Quest's.
  changeable: boolean;
  inPlace: boolean;
}

function ofKept({ kind, questId, title, startAt, place, people, mine, changeable }: KeptQuest): SetQuest {
  const others = people.filter(({ answer }) => answer !== 'declined');
  return {
    questId,
    title,
    startAt,
    place: place ?? '',
    people: others.map(({ name }) => name),
    shared: !mine || others.length > 0,
    changeable,
    inPlace: kind === 'meet',
  };
}

// The Quest the answer stands beside, or null for none.
export function setQuestOf(answer: AnswerReply | null): SetQuest | null {
  const kept = answer?.planSet ?? null;
  if (kept !== null) {
    return ofKept(kept);
  }
  const set = answer?.mealSet ?? null;
  if (set === null) {
    return null;
  }
  const { questId, title, startAt, place, friendNames, shared } = set;
  return { questId, title, startAt, place, people: friendNames, shared, changeable: !shared, inPlace: false };
}

// Whom the main server told of a meeting changed in place: one or two Friends by name, more as the first and how many
// others.
function toldOf(people: readonly string[]): string {
  const [first] = people;
  if (first === undefined) {
    return '';
  }
  return people.length > 2 ? `${first} 외 ${String(people.length - 1)}명` : people.join(', ');
}

// The answer's line once 바꾸기 changed a meeting in place (P04 ticket 17): its new time, and whom it told.
export function changedLineOf(startAt: string, people: readonly string[]): string {
  const changed = `약속을 ${koreaClock(startAt)}으로 바꿨어요`;
  return people.length === 0 ? changed : `${changed}. ${toldOf(people)}에게 알렸어요`;
}
