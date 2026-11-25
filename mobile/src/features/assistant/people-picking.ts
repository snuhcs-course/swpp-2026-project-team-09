/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput, TimeBand } from '@/api/assistant-types';
import type { BandLane } from '@/api/time-band-types';
import { hasPeople, peopleOf } from './plan-input';

// People picked in the time card (P04 ticket 64): after "＋ 같이" the User checks and unchecks Friends, the combined
// bar following each check, and the conditions change once, at 완료, with everyone checked.

// The people the User may check or uncheck: the conditions' people but the asker, by user id.
export function pickedOf(input: PlanInput): string[] {
  return peopleOf(input)
    .slice(1)
    .map(({ userId }) => userId);
}

export function toggled(picked: readonly string[], userId: string): string[] {
  return picked.includes(userId) ? picked.filter((id) => id !== userId) : [...picked, userId];
}

// The conditions with exactly the asker and the picked people: those already in keep their place and constraints, the
// new ones come after them in the order they were checked. The same conditions come back when nothing changed, so that
// 완료 then asks nothing.
export function withPicked(input: PlanInput, picked: readonly string[]): PlanInput {
  if (!hasPeople(input)) {
    return input;
  }
  const [asker, ...rest] = input.people;
  if (asker === undefined) {
    return input;
  }
  const kept = rest.filter(({ userId }) => picked.includes(userId));
  const added = picked
    .filter((id) => id !== asker.userId && !rest.some(({ userId }) => userId === id))
    .map((userId) => ({ userId, constraints: [] }));
  return kept.length === rest.length && added.length === 0 ? input : { ...input, people: [asker, ...kept, ...added] };
}

// The lanes the combined bar draws while picking: the asker's, then those of the checked people, the Plan's own lanes
// for those already in it and the other Friends' for the rest. A checked Friend whose lane the main server did not send
// adds none until the answer to 완료 brings it.
export function pickedLanes(band: TimeBand, picked: readonly string[]): BandLane[] {
  const [me, ...people] = band.lanes;
  const others = (band.others ?? []).map(({ userId, name, busy }) => ({ userId, name, busy }));
  const checked = [...people, ...others].filter(({ userId }) => picked.includes(userId));
  return me === undefined ? checked : [me, ...checked];
}

export interface PickRow {
  userId: string;
  name: string;
  me: boolean;
  checked: boolean;
  // Null when the main server sent no lane for this Friend.
  busy: BandLane['busy'] | null;
  // To the Plan's place; null where it is not known.
  walkMinutes: number | null;
}

interface RowsSource {
  band: TimeBand;
  picked: readonly string[];
  // The walking minutes of the Plan's people to its place, by user id.
  walks: ReadonlyMap<string, number | null>;
  // Every Friend of the User, for those the main server sent no lane for.
  friends: readonly { id: string; name: string }[];
}

// A row for the asker and one for each Friend: the asker first, then the checked, then the nearest, those whose
// whereabouts are not known last, a tie by name.
export function pickRowsOf({ band, picked, walks, friends }: RowsSource): PickRow[] {
  const [me, ...people] = band.lanes;
  const row = (userId: string, name: string, busy: PickRow['busy'], walkMinutes: number | null): PickRow => ({
    userId,
    name,
    me: false,
    checked: picked.includes(userId),
    busy,
    walkMinutes,
  });
  const lanes = [
    ...people.map(({ userId, name, busy }) => row(userId, name, busy, walks.get(userId) ?? null)),
    ...(band.others ?? []).map(({ userId, name, busy, walkMinutes }) => row(userId, name, busy, walkMinutes)),
  ];
  const rows = [
    ...lanes,
    ...friends
      .filter(({ id }) => id !== me?.userId && !lanes.some(({ userId }) => userId === id))
      .map(({ id, name }) => row(id, name, null, null)),
  ];
  const sorted = rows.toSorted(
    (one, other) =>
      Number(other.checked) - Number(one.checked) ||
      (one.walkMinutes ?? Number.POSITIVE_INFINITY) - (other.walkMinutes ?? Number.POSITIVE_INFINITY) ||
      one.name.localeCompare(other.name, 'ko'),
  );
  return me === undefined
    ? sorted
    : [
        {
          userId: me.userId,
          name: me.name,
          me: true,
          checked: true,
          busy: me.busy,
          walkMinutes: walks.get(me.userId) ?? null,
        },
        ...sorted,
      ];
}

// A row's state at its right: the walk to the Plan's place, or that where the Friend is is not known.
export function pickStateOf({ me, walkMinutes }: Pick<PickRow, 'me' | 'walkMinutes'>): string {
  if (walkMinutes !== null) {
    return `걸음 ${String(walkMinutes)}분`;
  }
  return me ? '' : '위치 모름';
}

// The button that ends picking: "완료", and how many people the Plan would have beyond those it has.
export function doneWordsOf(input: PlanInput, picked: readonly string[]): string {
  const added = picked.filter((id) => !pickedOf(input).includes(id)).length;
  return added === 0 ? '완료' : `완료 · ${String(added)}명`;
}
