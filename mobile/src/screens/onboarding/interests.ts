// The main server's limits for a User's hashtags.
export const MOST_INTERESTS = 20;
export const LONGEST_INTEREST = 30;

// The interests the `Onboarding` frame suggests, without the '#'.
const SUGGESTED = ['AI커리어', '러닝', '알고리즘', '재즈', '보드게임', '클라이밍', '스터디', '밴드'] as const;
const MOST_SUGGESTED = 5;

function sameInterest(one: string, other: string): boolean {
  return one.toLowerCase() === other.toLowerCase();
}

// What the User typed, as an interest: no whitespace, no '#' in front, 30 characters at most.
export function interestOf(typed: string): string {
  const [...characters] = typed.replaceAll(/\s/gu, '').replace(/^#+/u, '');
  return characters.slice(0, LONGEST_INTEREST).join('');
}

// What the field shows of what the User typed: the same, with the '#' the User put in front.
export function tidyDraft(typed: string): string {
  const prefix = typed.trimStart().startsWith('#') ? '#' : '';
  return `${prefix}${interestOf(typed)}`;
}

export function isFull(interests: readonly string[]): boolean {
  return interests.length >= MOST_INTERESTS;
}

// The interests with one more. They stay as they are for nothing typed, for a full list, and for an interest that
// is there already, whatever its case.
export function withInterest(interests: readonly string[], typed: string): readonly string[] {
  const interest = interestOf(typed);
  if (interest === '' || isFull(interests) || interests.some((held) => sameInterest(held, interest))) {
    return interests;
  }
  return [...interests, interest];
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
