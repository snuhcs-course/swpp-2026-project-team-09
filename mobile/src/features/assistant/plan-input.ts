/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';

// The changes the card makes to the conditions of a Plan before it asks for a recalculation. Each returns new
// conditions and carries the rest over as it is.

export function withoutPerson(input: PlanInput, userId: string): PlanInput {
  const [asker, ...others] = input.people;
  if (asker === undefined || asker.userId === userId) {
    return input;
  }
  return { ...input, people: [asker, ...others.filter((person) => person.userId !== userId)] };
}

export function withPerson(input: PlanInput, userId: string): PlanInput {
  if (input.people.some((person) => person.userId === userId)) {
    return input;
  }
  return { ...input, people: [...input.people, { userId, constraints: [] }] };
}

export function withBound(input: PlanInput, bound: 'from' | 'until', time: string): PlanInput {
  return { ...input, window: { ...input.window, [bound]: time } };
}

export function withOrigin(input: PlanInput, placeId: string): PlanInput {
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
