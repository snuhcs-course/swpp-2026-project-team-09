/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MealInput, PlanInput, PlanPerson } from '@/api/assistant-types';

const NO_WINDOW: MealInput['window'] = { from: null, until: null };

// The people of the conditions: a meal's or a new recruiting Quest's, the asker first; none for events and Quests.
export function peopleOf(input: PlanInput): readonly PlanPerson[] {
  return input.kind === 'meal' || input.kind === 'new-quest' ? input.people : [];
}

// The window the User fixed: a meal's; nothing fixed for the other kinds.
export function windowOf(input: PlanInput): MealInput['window'] {
  return input.kind === 'meal' ? input.window : NO_WINDOW;
}

// The changes the card makes to the conditions of a Plan before it asks for a recalculation. Each returns new
// conditions and carries the rest over as it is; conditions without people or a window are returned unchanged.

export function withoutPerson(input: PlanInput, userId: string): PlanInput {
  if (input.kind !== 'meal' && input.kind !== 'new-quest') {
    return input;
  }
  const [asker, ...others] = input.people;
  if (asker === undefined || asker.userId === userId) {
    return input;
  }
  return { ...input, people: [asker, ...others.filter((person) => person.userId !== userId)] };
}

export function withPerson(input: PlanInput, userId: string): PlanInput {
  if (
    (input.kind !== 'meal' && input.kind !== 'new-quest') ||
    input.people.some((person) => person.userId === userId)
  ) {
    return input;
  }
  return { ...input, people: [...input.people, { userId, constraints: [] }] };
}

export function withBound(input: PlanInput, bound: 'from' | 'until', time: string): PlanInput {
  return input.kind === 'meal' ? { ...input, window: { ...input.window, [bound]: time } } : input;
}

export function withOrigin(input: PlanInput, placeId: string): PlanInput {
  if (input.kind !== 'meal' && input.kind !== 'new-quest') {
    return input;
  }
  const [asker, ...others] = input.people;
  if (asker === undefined) {
    return input;
  }
  const constraints = [
    ...asker.constraints.filter((constraint) => constraint.kind !== 'from'),
    { kind: 'from' as const, placeId, source: 'asker' as const },
  ];
  return { ...input, people: [{ ...asker, constraints }, ...others] };
}
