/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MealInput, PlanInput, PlanPerson } from '@/api/assistant-types';

const NO_WINDOW: MealInput['window'] = { from: null, until: null };

type WithPeople = Extract<PlanInput, { people: PlanPerson[] }>;

export function hasPeople(input: PlanInput): input is WithPeople {
  return input.kind === 'meal' || input.kind === 'new-quest' || input.kind === 'meet' || input.kind === 'study';
}

// The people of the conditions: a meal's, a meet's, a study's, or a new recruiting Quest's, the asker first; none for
// events and Quests.
export function peopleOf(input: PlanInput): readonly PlanPerson[] {
  return hasPeople(input) ? input.people : [];
}

// The kinds whose window the User fixes on the band: a meal, a meet, and a study answer.
type Windowed = Extract<PlanInput, { kind: 'meal' | 'meet' | 'study' }>;

function isWindowed(input: PlanInput): input is Windowed {
  return input.kind === 'meal' || input.kind === 'meet' || input.kind === 'study';
}

// The window the User fixed; nothing fixed for the other kinds.
export function windowOf(input: PlanInput): MealInput['window'] {
  return isWindowed(input) ? input.window : NO_WINDOW;
}

// The changes the card makes to the conditions of a Plan before it asks for a recalculation. Each returns new
// conditions and carries the rest over as it is; conditions without people or a window are returned unchanged.

export function withoutPerson(input: PlanInput, userId: string): PlanInput {
  if (!hasPeople(input)) {
    return input;
  }
  const [asker, ...others] = input.people;
  if (asker === undefined || asker.userId === userId) {
    return input;
  }
  return { ...input, people: [asker, ...others.filter((person) => person.userId !== userId)] };
}

export function withPerson(input: PlanInput, userId: string): PlanInput {
  if (!hasPeople(input) || input.people.some((person) => person.userId === userId)) {
    return input;
  }
  return { ...input, people: [...input.people, { userId, constraints: [] }] };
}

export function withBound(input: PlanInput, bound: 'from' | 'until', time: string | null): PlanInput {
  return isWindowed(input) ? { ...input, window: { ...input.window, [bound]: time } } : input;
}

// The band moved whole: its start fixed, and its end left to the server, which plans the longest time from then.
export function withStart(input: PlanInput, time: string): PlanInput {
  return isWindowed(input) ? { ...input, window: { from: time, until: null } } : input;
}

export function withOrigin(input: PlanInput, placeId: string): PlanInput {
  // A new party's people carry no constraints: the main server refuses them.
  if (!hasPeople(input) || input.kind === 'new-quest') {
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

// A meal's conditions with that Class back in the plan (P04 ticket 93): without the field once none is left out, so
// that a main server before the field is sent nothing new. Other conditions, or a Class not left out, are unchanged.
export function withoutSkipped(input: PlanInput, classId: string): PlanInput {
  if (input.kind !== 'meal' || !(input.skipped ?? []).includes(classId)) {
    return input;
  }
  const { skipped = [], ...rest } = input;
  const left = skipped.filter((id) => id !== classId);
  return left.length === 0 ? rest : { ...rest, skipped: left };
}
