/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MealInput } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import type { ShownChatCard } from '@/api/quest-parts-types';
import { koreaDaysAfter } from '@/korea-time';
import type { ChatBubble } from './use-chat';

// The follow-ups offered under a reply: whole sentences the User could have typed, each tried against the main
// server's Assistant and kept only where it brought what it names (P02 ticket 36). They are fixed per kind of reply and
// filled from the reply's own date, meal, Friends and place, so that each stands without the turns before it: a turn
// a card's button asked is never sent to the Assistant. A sentence that leans on the reply before ("다른 열람실") is
// offered only under a reply to a message, which the next request sends.

const MEAL_WORD = { lunch: '점심', dinner: '저녁' } as const;
const DAY_WORD = ['오늘', '내일'] as const;
// At most this many under a reply.
const MOST = 2;

// "김민수랑", "박지은이랑": 이랑 after a final consonant.
export function withRang(names: readonly string[]): string {
  const last = names.at(-1) ?? '';
  const syllable = (last.codePointAt(last.length - 1) ?? 0) - 0xac00;
  const closed = syllable >= 0 && syllable < 11172 && syllable % 28 !== 0;
  return `${names.join(', ')}${closed ? '이랑' : '랑'}`;
}

// 0 for today, 1 for tomorrow, in Korea's calendar.
function dayOf(date: string, now: Date): number {
  return koreaDaysAfter(now, new Date(`${date}T12:00:00+09:00`));
}

// The User's Friends' names by their User ids, as the app knows them.
export type FriendNames = ReadonlyMap<string, string>;

// The Friends of an answer by their person chips. A chip's words may carry a mark after the name, such as
// "민수 · 자리 모름" for a Friend whose origin is unknown, so the name is the Friend's own by the chip's User id, or
// else the words before " · ", as the main server reads them (`plan-tools.ts`).
function friendsOf(answer: AnswerReply, names: FriendNames): string[] {
  return answer.chips.flatMap(({ kind, text, userId }) =>
    kind === 'person' ? [(userId === null ? undefined : names.get(userId)) ?? text.split(' · ')[0] ?? text] : [],
  );
}

// The next meals after this one, today's and tomorrow's: a lunch's dinner, then tomorrow's lunch and dinner.
function laterMeals({ date, meal }: MealInput, now: Date): { day: number; meal: MealInput['meal'] }[] {
  const day = dayOf(date, now);
  const all = [
    { day: 0, meal: 'lunch' as const },
    { day: 0, meal: 'dinner' as const },
    { day: 1, meal: 'lunch' as const },
    { day: 1, meal: 'dinner' as const },
  ];
  const at = all.findIndex((one) => one.day === day && one.meal === meal);
  return at < 0 ? [] : all.slice(at + 1);
}

function mealFollowUps(answer: AnswerReply & { input: MealInput }, now: Date, names: FriendNames): string[] {
  const friends = friendsOf(answer, names);
  return laterMeals(answer.input, now).map(({ day, meal }) =>
    friends.length === 0
      ? `${DAY_WORD[day]} ${MEAL_WORD[meal]} 배고파`
      : `${withRang(friends)} ${DAY_WORD[day]} ${MEAL_WORD[meal]} 먹자`,
  );
}

function answerFollowUps(answer: AnswerReply, asked: boolean, now: Date, names: FriendNames): string[] {
  const { input } = answer;
  if (answer.noPlan !== null) {
    return [];
  }
  if (input.kind === 'meal') {
    return mealFollowUps({ ...answer, input }, now, names);
  }
  if (input.kind === 'meet') {
    const [name] = friendsOf(answer, names);
    if (name === undefined) {
      return [];
    }
    const tomorrow = dayOf(input.date, now) === 0 ? [`${withRang([name])} 내일 만나고 싶어`] : [];
    return [`${withRang([name])} 같이 밥 먹자`, ...tomorrow];
  }
  if (input.kind === 'events') {
    const parties = asked ? ['같이 갈 파티 있어?'] : [];
    const tomorrow = dayOf(input.date, now) === 0 ? ['내일 볼 만한 거 있어?'] : [];
    return [...parties, ...tomorrow];
  }
  return [];
}

function lookupFollowUps(lookup: Lookup): string[] {
  if (lookup.kind === 'friend') {
    const friend = lookup.scene.people.find(({ me }) => !me);
    return friend === undefined ? [] : [`${withRang([friend.name])} 같이 밥 먹자`];
  }
  if (lookup.kind === 'menu') {
    const [first] = lookup.lines;
    const restaurant = first?.find(({ strong }) => strong)?.text;
    const today = first?.some(({ text }) => text.includes('오늘')) ?? false;
    return restaurant !== undefined && today ? [`내일 ${restaurant} 메뉴 뭐야?`] : [];
  }
  return [];
}

// What the follow-ups are chosen by: a reply's bubble (`ChatBubble`) gives it all.
export interface FollowUpSource {
  failure: ChatBubble['failure'];
  refusal?: object | null;
  offers?: readonly object[];
  recalculated?: boolean;
  answer?: AnswerReply | null;
  lookup?: Lookup | null;
  cards: readonly { kind: ShownChatCard['kind'] }[];
}

// The follow-ups under `reply`, the one that turns the reply into going together first. None under a refusal, a
// reply with offers of its own, a failure, or an answer without a Plan, whose own buttons say what to try.
export function followUpsOf(reply: FollowUpSource | undefined, now: Date, names: FriendNames = new Map()): string[] {
  if (
    reply === undefined ||
    reply.failure !== null ||
    (reply.refusal ?? null) !== null ||
    (reply.offers?.length ?? 0) > 0
  ) {
    return [];
  }
  const asked = reply.recalculated !== true;
  const { answer = null, lookup = null, cards } = reply;
  if (answer !== null) {
    return answerFollowUps(answer, asked, now, names).slice(0, MOST);
  }
  if (lookup !== null) {
    return lookupFollowUps(lookup).slice(0, MOST);
  }
  if (!asked) {
    return [];
  }
  if (cards.some(({ kind }) => kind === 'quest')) {
    return ['운동 파티만 보여줘'];
  }
  return cards.some(({ kind }) => kind === 'library') ? ['다른 열람실'] : [];
}
