/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput, TimeBand } from '@/api/assistant-types';
import type { BandLane } from '@/api/time-band-types';
import { hasPeople, peopleOf } from './plan-input';
import { clockAt, msOf, onBandDay } from './time-band';

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
  // From the User's Friend list, shown quieter beside the name; null for the asker or one not in the list.
  department: string | null;
}

interface RowsSource {
  band: TimeBand;
  picked: readonly string[];
  // The walking minutes of the Plan's people to its place, by user id; a Friend with none takes the phone's guess.
  walks: ReadonlyMap<string, number | null>;
  // Every Friend of the User, for those the main server sent no lane for, with the phone's guess of their walk, and
  // each one's department for every row.
  friends: readonly { id: string; name: string; department?: string; walkMinutes: number | null }[];
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
    department: friends.find(({ id }) => id === userId)?.department ?? null,
  });
  const walkOf = (userId: string): number | null =>
    walks.has(userId) ? (walks.get(userId) ?? null) : (friends.find(({ id }) => id === userId)?.walkMinutes ?? null);
  const lanes = [
    ...people.map(({ userId, name, busy }) => row(userId, name, busy, walkOf(userId))),
    ...(band.others ?? []).map(({ userId, name, busy, walkMinutes }) => row(userId, name, busy, walkMinutes)),
  ];
  const rows = [
    ...lanes,
    ...friends
      .filter(({ id }) => id !== me?.userId && !lanes.some(({ userId }) => userId === id))
      .map(({ id, name, walkMinutes }) => row(id, name, null, walkMinutes)),
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
          department: null,
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

// The button that ends picking: "완료", with how many Friends are checked now; "닫기" with no Friend to pick.
export function doneWordsOf(picked: readonly string[], friends: number): string {
  if (friends === 0) {
    return '닫기';
  }
  return picked.length === 0 ? '완료' : `완료 · ${String(picked.length)}명`;
}

// About 80 metres a minute on foot, for a Friend the main server sent no walk for: the straight line to the Plan's
// place, rounded up.
const WALK_METRES_A_MINUTE = 80;

export function walkGuessOf(metres: number | null): number | null {
  return metres === null ? null : Math.max(1, Math.ceil(metres / WALK_METRES_A_MINUTE));
}

// The span the combined bar previews while picking: as long as the Plan's, from its start or the end of the checked
// people's busy stretch it falls in, until the next busy stretch of anyone checked; its words say the new times and
// minutes ("18:15–18:56 · 식사 41분"). A preview only: the answer to 완료 brings the Plan's own (P04 ticket 64).
export function previewOf(band: TimeBand, lanes: readonly BandLane[]): Pick<TimeBand, 'startAt' | 'endAt' | 'text'> {
  const busy = lanes.flatMap((lane) => lane.busy).map(({ startAt, endAt }) => [msOf(startAt), msOf(endAt)] as const);
  const length = msOf(band.endAt) - msOf(band.startAt);
  let start = msOf(band.startAt);
  for (let moved = true; moved;) {
    moved = false;
    for (const [from, until] of busy) {
      if (from <= start && until > start) {
        start = until;
        moved = true;
      }
    }
  }
  const next = Math.min(msOf(band.range.endAt), ...busy.map(([from]) => from).filter((from) => from > start));
  const end = Math.min(start + length, next);
  if (end <= start) {
    return { startAt: band.startAt, endAt: band.endAt, text: band.text };
  }
  const [from, until] = [clockAt(start), clockAt(end)];
  const minutes = Math.round((end - start) / 60_000);
  const text = band.text
    .replace(/^\d\d:\d\d–\d\d:\d\d/u, `${from}–${until}`)
    .replace(/\d+분$/u, `${String(minutes)}분`);
  return { startAt: onBandDay(from, band), endAt: onBandDay(until, band), text };
}
