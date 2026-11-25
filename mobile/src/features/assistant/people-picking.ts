/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
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

// What keeps a Friend from the Plan's time: the first of their busy stretches over the span, when it starts and ends,
// and what it is, from its lane's label ("일정" for a step of a Quest, "수업" or "302동 수업" for a Class); null for a
// stretch with no label, as an older main server sends.
export interface BusyAtSpan {
  startAt: string;
  endAt: string;
  kind: 'class' | 'quest' | null;
}

export interface PickRow {
  userId: string;
  name: string;
  checked: boolean;
  // Null when the Friend is free over the Plan's span, or when the main server sent no busy stretches for them.
  busyAtSpan: BusyAtSpan | null;
  // What the row says of it at its right (`reasonOf`), null when free.
  reason: string | null;
  // To the Plan's place; null where it is not known.
  walkMinutes: number | null;
  // From the User's Friend list; null for one not in the list.
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

function kindOf(label: string | undefined): BusyAtSpan['kind'] {
  if (label === undefined) {
    return null;
  }
  return label === '일정' ? 'quest' : 'class';
}

export function busyAtSpanOf(busy: BandLane['busy'], span: Pick<TimeBand, 'startAt' | 'endAt'>): BusyAtSpan | null {
  const from = msOf(span.startAt);
  const until = msOf(span.endAt);
  const [first] = busy
    .filter(({ startAt, endAt }) => msOf(startAt) < until && msOf(endAt) > from)
    .toSorted((one, other) => msOf(one.startAt) - msOf(other.startAt));
  return first === undefined ? null : { startAt: first.startAt, endAt: first.endAt, kind: kindOf(first.label) };
}

// The reason a busy Friend's row gives (variant R3 of the boards): busy as the span starts, until when ("18:15까지
// 수업"); else from when ("17:30부터 일정"). Anything but a Class is "일정", never its title.
export function reasonOf({ startAt, endAt, kind }: BusyAtSpan, span: Pick<TimeBand, 'startAt'>): string {
  const what = kind === 'class' ? '수업' : '일정';
  return msOf(startAt) <= msOf(span.startAt)
    ? `${clockAt(msOf(endAt))}까지 ${what}`
    : `${clockAt(msOf(startAt))}부터 ${what}`;
}

// A row for each Friend while picking, in no order (`openOrderOf`); the asker has none: picking shows no bars, and
// the combined bar on top is everyone's (the user's decision, 2026-11-25).
export function pickRowsOf({ band, picked, walks, friends }: RowsSource): PickRow[] {
  const [me, ...people] = band.lanes;
  const row = (userId: string, name: string, busy: BandLane['busy'] | null, walkMinutes: number | null): PickRow => {
    const busyAtSpan = busy === null ? null : busyAtSpanOf(busy, band);
    return {
      userId,
      name,
      checked: picked.includes(userId),
      busyAtSpan,
      reason: busyAtSpan === null ? null : reasonOf(busyAtSpan, band),
      walkMinutes,
      department: friends.find(({ id }) => id === userId)?.department ?? null,
    };
  };
  const walkOf = (userId: string): number | null =>
    walks.has(userId) ? (walks.get(userId) ?? null) : (friends.find(({ id }) => id === userId)?.walkMinutes ?? null);
  const lanes = [
    ...people.map(({ userId, name, busy }) => row(userId, name, busy, walkOf(userId))),
    ...(band.others ?? []).map(({ userId, name, busy, walkMinutes }) => row(userId, name, busy, walkMinutes)),
  ];
  return [
    ...lanes,
    ...friends
      .filter(({ id }) => id !== me?.userId && !lanes.some(({ userId }) => userId === id))
      .map(({ id, name, walkMinutes }) => row(id, name, null, walkMinutes)),
  ];
}

function groupOf({ checked, walkMinutes, busyAtSpan }: PickRow): number {
  if (checked) {
    return 0;
  }
  if (busyAtSpan !== null) {
    return 2;
  }
  return walkMinutes === null ? 3 : 1;
}

// The rows' order, worked out once as picking opens and kept until it ends, so that a check never moves a row (the
// user's phone, 2026-11-25): those picked already, then the free by nearness, then those busy over the span by
// nearness, the unknown last among them, then the free whose whereabouts are not known; a tie by name.
export function openOrderOf(rows: readonly PickRow[]): string[] {
  const far = Number.POSITIVE_INFINITY;
  return rows
    .toSorted(
      (one, other) =>
        groupOf(one) - groupOf(other) ||
        (one.walkMinutes ?? far) - (other.walkMinutes ?? far) ||
        one.name.localeCompare(other.name, 'ko'),
    )
    .map(({ userId }) => userId);
}

// The rows in an order worked out before. A row it does not know, as a Friend the list brought later, is left out
// until picking opens again, so that the rows never grow or move once open (P04 ticket 67).
export function inOrder(rows: readonly PickRow[], order: readonly string[]): PickRow[] {
  const byId = new Map(rows.map((row) => [row.userId, row]));
  return order.flatMap((userId) => {
    const row = byId.get(userId);
    return row === undefined ? [] : [row];
  });
}

// A row's one word at its right (variant R3): the reason of a Friend busy over the span, else the walk to the Plan's
// place, else that where the Friend is is not known, which reads quieter.
export function pickStateOf({ reason, walkMinutes }: Pick<PickRow, 'reason' | 'walkMinutes'>): {
  words: string;
  quiet: boolean;
} {
  if (reason !== null) {
    return { words: reason, quiet: false };
  }
  return walkMinutes === null
    ? { words: '위치 모름', quiet: true }
    : { words: `걸음 ${String(walkMinutes)}분`, quiet: false };
}

// The button that ends picking: "완료", or "닫기" with no Friend to pick. It names no count (the user's phone,
// 2026-11-25).
export function doneWordsOf(friends: number): string {
  return friends === 0 ? '닫기' : '완료';
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
