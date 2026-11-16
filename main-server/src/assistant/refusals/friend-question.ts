/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Presented, type ToolContext } from '../feature.js';
import { type FoundIds } from '../found-ids.js';
import { withSubject } from '../gathering/answer-words.js';
import { type PickFriendOffer, type Refusal } from './refusal.dto.js';
import { refusalOf } from './refusals.js';

// The question of which Friend the User meant, when their words fit several (P01-20): the server writes it from the
// Friends resolveFriend found, and an app that draws answers shows each as a cell that picks them. An older app, and the
// model, keep the question in words (`tools/which-friend.ts`).

// A Friend the words fit, as the Friend view gives them to the asker.
export interface FriendCandidate {
  id: string;
  name: string;
  department: string;
}

// What resolveFriend tells the model beside its several when the app shows the question.
export const QUESTION_SHOWN =
  'The app asks the User which one, with a cell for each candidate. Write nothing more, and call nothing else.';

const COUNT_WORDS = new Map([
  [2, '두'],
  [3, '세'],
  [4, '네'],
  [5, '다섯'],
  [6, '여섯'],
  [7, '일곱'],
  [8, '여덟'],
  [9, '아홉'],
  [10, '열'],
]);

// "두 명" to "열 명" in words, and more in digits.
function peopleCount(count: number): string {
  const word = COUNT_WORDS.get(count);
  return word === undefined ? `${count}명` : `${word} 명`;
}

// The second line fits what the Friend was found for.
const ASKS = new Map([
  ['planMeal', '누구와 먹을까요?'],
  ['planMeet', '누구와 만날까요?'],
]);

function askOf(tool: string | null): string {
  return (tool === null ? undefined : ASKS.get(tool)) ?? '누구인가요?';
}

// The words the User wrote, how many Friends they fit, the candidates in resolveFriend's order, and the tool they were
// found for, if known. The department stands only beside a candidate's name, never in a line.
export function friendQuestion(
  words: string,
  count: number,
  candidates: readonly FriendCandidate[],
  tool: string | null,
): Refusal {
  const offers = candidates.map(({ id, name, department }): PickFriendOffer => ({
    kind: 'pick-friend',
    userId: id,
    label: name,
    aside: department === '' ? null : department,
    text: name,
  }));
  return refusalOf('which-friend', {
    lines: [`${withSubject(words)} ${peopleCount(count)}이에요.`, askOf(tool)],
    offers,
  });
}

// Puts the question in the reply of an app that draws answers, unless an answer or a Lookup is there already, which a
// refusal never stands beside, and says whether it did.
export function askWhichFriend(
  { capabilities, presented }: Pick<ToolContext, 'capabilities' | 'presented'>,
  question: Refusal,
): boolean {
  if (!capabilities.has('answer') || presented.answer !== null || presented.lookup !== null) {
    return false;
  }
  presented.refusal = question;
  return true;
}

// A tool given a Friend of the several: the question asks for what that tool plans.
export function askedBy(tool: string, friendIds: readonly string[], found: FoundIds, presented: Presented): void {
  const { refusal } = presented;
  if (refusal?.kind !== 'which-friend' || found.contested('friend', friendIds).length === 0) {
    return;
  }
  const [first] = refusal.lines;
  presented.refusal = { ...refusal, lines: [first, [{ text: askOf(tool), strong: false }]] };
}

// A later 'one' that names a candidate of the question answers it.
export function answeredBy(userId: string, presented: Presented): void {
  const offers = presented.refusal?.kind === 'which-friend' ? presented.refusal.offers : [];
  if (offers.some((offer) => offer.kind === 'pick-friend' && offer.userId === userId)) {
    presented.refusal = null;
  }
}
