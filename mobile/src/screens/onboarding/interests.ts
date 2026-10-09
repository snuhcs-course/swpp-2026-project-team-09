/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { lengthOf } from './length';

// The main server's limits for a User's hashtags.
export const MOST_INTERESTS = 20;
export const LONGEST_INTEREST = 30;

// The interests the `Onboarding` frame suggests, without the '#'.
const SUGGESTED = ['AI커리어', '러닝', '알고리즘', '재즈', '보드게임', '클라이밍', '스터디', '밴드'] as const;
const MOST_SUGGESTED = 5;

// Why an interest was not added.
export type Refusal = 'full' | 'twice' | 'long';

export const REFUSAL_WORDS: Record<Refusal, string> = {
  full: `관심사는 ${MOST_INTERESTS}개까지 추가할 수 있어요`,
  twice: '이미 추가한 관심사예요',
  long: `${LONGEST_INTEREST}자까지 쓸 수 있어요`,
};

function sameInterest(one: string, other: string): boolean {
  return one.toLowerCase() === other.toLowerCase();
}

// The interests in what the User typed or pasted: whitespace, a comma and a '#' each end one, and none holds a '#'.
export function interestsIn(typed: string): string[] {
  return typed.split(/[\s,#]+/u).filter((part) => part !== '');
}

export function isFull(interests: readonly string[]): boolean {
  return interests.length >= MOST_INTERESTS;
}

function refusalOf(interests: readonly string[], interest: string): Refusal | null {
  if (lengthOf(interest) > LONGEST_INTEREST) {
    return 'long';
  }
  if (interests.some((held) => sameInterest(held, interest))) {
    return 'twice';
  }
  return isFull(interests) ? 'full' : null;
}

export interface Added {
  interests: readonly string[];
  // What stays in the field: nothing, or the interests that were not added. When none was, it is what was typed.
  left: string;
  // Why the first of those was not added.
  refusal: Refusal | null;
}

// Adds every interest in what was typed. One that is too long, there already whatever its case, or more than the
// list takes is not added and stays in the field.
export function addInterests(held: readonly string[], typed: string): Added {
  const interests = [...held];
  const refused: string[] = [];
  let refusal: Refusal | null = null;
  for (const interest of interestsIn(typed)) {
    const why = refusalOf(interests, interest);
    if (why === null) {
      interests.push(interest);
    } else {
      refusal ??= why;
      refused.push(interest);
    }
  }
  const left = interests.length === held.length ? typed : refused.join(' ');
  return { interests, left, refusal };
}

// The first five suggested interests that the User does not have yet, and none for a full list.
export function suggestedFor(interests: readonly string[]): string[] {
  if (isFull(interests)) {
    return [];
  }
  return SUGGESTED.filter((suggested) => !interests.some((held) => sameInterest(held, suggested))).slice(
    0,
    MOST_SUGGESTED,
  );
}
