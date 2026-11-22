/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, KeptQuest } from '@/api/assistant-types';
import { koreaClock } from '@/korea-time';

// A Quest the User already holds that an answer stands beside (P04 ticket 17): what it is, when and where, with whom,
// whether others share it, whether this answer may change it, and whether 바꾸기 changes it in place
// (`PUT /plans/{questId}`: any changeable meeting or meal, P05 ticket 31) or makes the answer's Plan in its place (a
// meal of a server before it, `POST /plans`). One shape for every planner's answer: the main server's `planSet` first,
// else a meal answer's `mealSet` of a server before it.
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
  // What it is called: 점심, 저녁, 약속, or 일정.
  word: string;
}

// What a Quest already set is called on the map and in the line after 그대로 두기 (P04 ticket 20).
const KIND_WORDS: Record<KeptQuest['kind'], string> = {
  'meal-lunch': '점심',
  'meal-dinner': '저녁',
  meet: '약속',
  event: '일정',
  seat: '일정',
  other: '일정',
};

// A meal named by a main server before P05 ticket 17, which says no kind: a lunch before 16:00.
function mealWordOf(startAt: string): string {
  return koreaClock(startAt) < '16:00' ? '점심' : '저녁';
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
    inPlace: true,
    word: KIND_WORDS[kind],
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
  const word = mealWordOf(startAt);
  return { questId, title, startAt, place, people: friendNames, shared, changeable: !shared, inPlace: false, word };
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

// The tag of a Quest already set at its place on the map: "잡힌 점심 12:16".
export function keptTagOf({ kind, startAt }: Pick<KeptQuest, 'kind' | 'startAt'>): string {
  return `잡힌 ${KIND_WORDS[kind]} ${koreaClock(startAt)}`;
}

// The answer's line once 바꾸기 changed a meeting or a meal in place (P04 ticket 17): its new time, and whom it told.
// Every word of `word` ends in a final consonant, so it takes 을.
export function changedLineOf(startAt: string, people: readonly string[], word = '약속'): string {
  const changed = `${word}을 ${koreaClock(startAt)}으로 바꿨어요`;
  return people.length === 0 ? changed : `${changed}. ${toldOf(people)}에게 알렸어요`;
}

// The answer's line once 그대로 두기 left the Quest as it is (P04 ticket 20): "12:16 302동식당 점심을 그대로 뒀어요". Every
// word ends in a final consonant, so it takes 을.
export function leftLineOf({ startAt, place, word }: Pick<SetQuest, 'startAt' | 'place' | 'word'>): string {
  const what = [koreaClock(startAt), place, word].filter((part) => part !== '').join(' ');
  return `${what}을 그대로 뒀어요`;
}
