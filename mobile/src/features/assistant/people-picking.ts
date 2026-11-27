/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput, TimeBand } from '@/api/assistant-types';
import type { BandLane } from '@/api/time-band-types';
import { hasPeople, peopleOf } from './plan-input';
import { lengthWords } from '@/library/cards/slot-band';
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
// stretch with no label, as an older main server sends. A Class's label, which names its Place when it has one, is
// kept for the row's words (P04 ticket 68).
export interface BusyAtSpan {
  startAt: string;
  endAt: string;
  kind: 'class' | 'quest' | null;
  label?: string;
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
  // The item of their day the main server has them set out after, as "83동 수업"; null when it sent none.
  after: string | null;
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
  if (first === undefined) {
    return null;
  }
  const kind = kindOf(first.label);
  const at = { startAt: first.startAt, endAt: first.endAt, kind };
  return kind === 'class' && first.label !== undefined ? { ...at, label: first.label } : at;
}

// The reason a busy Friend's row gives (variant R3 of the boards): busy as the span starts, until when ("18:15까지
// 16동 수업"); else from when ("17:30부터 일정"). A Class names its Place when it has one, as its lane's label does
// (P04 ticket 68); anything but a Class is "일정", never its title.
export function reasonOf({ startAt, endAt, kind, label }: BusyAtSpan, span: Pick<TimeBand, 'startAt'>): string {
  const what = kind === 'class' ? (label ?? '수업') : '일정';
  return msOf(startAt) <= msOf(span.startAt)
    ? `${clockAt(msOf(endAt))}까지 ${what}`
    : `${clockAt(msOf(startAt))}부터 ${what}`;
}

// A row for each Friend while picking, in no order (`openOrderOf`); the asker has none: picking shows no bars, and
// the combined bar on top is everyone's (the user's decision, 2026-11-25).
export function pickRowsOf({ band, picked, walks, friends }: RowsSource): PickRow[] {
  const [me, ...people] = band.lanes;
  const row = (
    { userId, name, busy }: { userId: string; name: string; busy: BandLane['busy'] | null },
    walkMinutes: number | null,
    after: string | null = null,
  ): PickRow => {
    const busyAtSpan = busy === null ? null : busyAtSpanOf(busy, band);
    return {
      userId,
      name,
      checked: picked.includes(userId),
      busyAtSpan,
      reason: busyAtSpan === null ? null : reasonOf(busyAtSpan, band),
      walkMinutes,
      after,
      department: friends.find(({ id }) => id === userId)?.department ?? null,
    };
  };
  const walkOf = (userId: string): number | null =>
    walks.has(userId) ? (walks.get(userId) ?? null) : (friends.find(({ id }) => id === userId)?.walkMinutes ?? null);
  const lanes = [
    ...people.map((lane) => row(lane, walkOf(lane.userId))),
    ...(band.others ?? []).map((other) => row(other, other.walkMinutes, other.after ?? null)),
  ];
  return [
    ...lanes,
    ...friends
      .filter(({ id }) => id !== me?.userId && !lanes.some(({ userId }) => userId === id))
      .map(({ id, name, walkMinutes }) => row({ userId: id, name, busy: null }, walkMinutes)),
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
// place, after the item it starts from when the main server names one ("83동 수업 뒤 · 걸음 3분", P04 ticket 68), else
// that where the Friend is is not known, which reads quieter.
export function pickStateOf({ reason, walkMinutes, after }: Pick<PickRow, 'reason' | 'walkMinutes' | 'after'>): {
  words: string;
  quiet: boolean;
} {
  if (reason !== null) {
    return { words: reason, quiet: false };
  }
  if (walkMinutes === null) {
    return { words: '위치 모름', quiet: true };
  }
  const walk = `걸음 ${String(walkMinutes)}분`;
  return { words: after === null ? walk : `${after} 뒤 · ${walk}`, quiet: false };
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

// A band's length after its span: "식사 41분", "2시간", "1시간 30분".
const LENGTH = /(?:\d+시간(?: \d+분)?|\d+분)$/u;

// The words of a previewed span: its times, then its length in the words the band said it in. A band that said what
// its span runs into ("14:00 수업과 겹쳐요", a seat card's) says the length once the span moved, for the preview leaves
// every checked person's busy stretch (P10 ticket 15).
function previewWords(text: string, span: { from: string; until: string; minutes: number }, moved: boolean): string {
  const times = `${span.from}–${span.until}`;
  const at = text.indexOf(' · ');
  if (at < 0) {
    return text.replace(/^\d\d:\d\d–\d\d:\d\d/u, times);
  }
  const after = text.slice(at + ' · '.length);
  const said = LENGTH.exec(after)?.[0];
  if (said === undefined) {
    return moved ? `${times} · ${lengthWords(span.minutes)}` : text;
  }
  const length = said.includes('시간') ? lengthWords(span.minutes) : `${String(span.minutes)}분`;
  return `${times} · ${after.slice(0, after.length - said.length)}${length}`;
}

// The span the combined bar previews while picking: as long as the Plan's, from its start or the end of the checked
// people's busy stretch it falls in, until the next busy stretch of anyone checked; its words say the new times and
// length ("18:15–18:56 · 식사 41분"). A preview only: the answer to 완료 brings the Plan's own (P04 ticket 64).
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
  const moved = start !== msOf(band.startAt) || end !== msOf(band.endAt);
  const text = previewWords(band.text, { from, until, minutes }, moved);
  return { startAt: onBandDay(from, band), endAt: onBandDay(until, band), text };
}
