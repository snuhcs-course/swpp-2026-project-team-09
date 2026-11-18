/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// The first run's cards (P05 ticket 09), in the order they are shown.
export type FirstRunCard = 'timetable' | 'interests' | 'friend';

const ORDER: readonly FirstRunCard[] = ['timetable', 'interests', 'friend'];

// How many Classes, watched interests, and Friends the User has: undefined while not known, and `interests` null from
// a main server that keeps no interests.
export interface FirstRunFacts {
  classes: number | undefined;
  interests: number | null | undefined;
  friends: number | undefined;
}

export function countOf(card: FirstRunCard, { classes, interests, friends }: FirstRunFacts): number | null | undefined {
  if (card === 'timetable') {
    return classes;
  }
  return card === 'interests' ? interests : friends;
}

// The first card that waits and asks for what the User lacks. A card waits behind one whose question is not known
// yet, so that no card shows only to be taken away. `again`: the line over the input opened the interests card.
export function cardToShow(
  waiting: readonly FirstRunCard[] | null,
  facts: FirstRunFacts,
  again = false,
): FirstRunCard | null {
  if (again && facts.interests === 0) {
    return 'interests';
  }
  for (const card of ORDER) {
    if (waiting?.includes(card) === true) {
      const count = countOf(card, facts);
      if (count === undefined) {
        return null;
      }
      if (count === 0) {
        return card;
      }
    }
  }
  return null;
}

// The waiting cards whose question the User answered elsewhere: a Class added on 시간표 answers the Timetable's.
export function answeredElsewhere(waiting: readonly FirstRunCard[] | null, facts: FirstRunFacts): FirstRunCard[] {
  return (waiting ?? []).filter((card) => {
    const count = countOf(card, facts);
    return typeof count === 'number' && count > 0;
  });
}

// The line over the input, for a User of the first run who watches no interest.
export function asksForInterests(waiting: readonly FirstRunCard[] | null, facts: FirstRunFacts): boolean {
  return waiting !== null && facts.interests === 0;
}
