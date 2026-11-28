/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 * 2026-11-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, ConditionChip, TimeBand } from '@/api/assistant-types';
import { withParticle } from '@/features/map/short-name';

import { bandTimeAt, clockOf, earliestMsOf, msOf, stepMsOf, type Stretch } from './time-band';

// The time band moved whole: its width kept, by whole steps of the distance moved, inside the range; and who cannot
// come in the time it covers.

type Band = Pick<TimeBand, 'range' | 'startAt' | 'endAt' | 'rules'>;
type Lane = TimeBand['lanes'][number];
type Busy = Lane['busy'][number];

// A busy stretch the band overlaps: the part it covers, and the stretch whole.
export interface Clash {
  userId: string;
  name: string;
  startAt: string;
  endAt: string;
  busy: Busy;
}

function movedBy(band: Band, distance: number): Stretch {
  const start = msOf(band.startAt);
  const width = msOf(band.endAt) - start;
  const moved = Math.min(Math.max(start + distance, earliestMsOf(band)), msOf(band.range.endAt) - width);
  return { startAt: bandTimeAt(moved), endAt: bandTimeAt(moved + width) };
}

// A whole move stands the band's start on the clock's ten minutes (P01 ticket 44), so that a far time such as 07:00 is
// reached exactly on a range from now to the place's closing, or on its rules' own steps when they are longer, as a
// seat's half hours.
export const MOVE_STEP_MINUTES = 10;

function moveStepMs(band: Band): number {
  return Math.max(stepMsOf(band), MOVE_STEP_MINUTES * 60_000);
}

// `share` is the distance dragged as a share of the range's width; less than half a step moves nothing. Halfway between
// two ten minutes, as 12:25 is from a start at 12:15, the one nearer the band's own place is taken, so that the band
// never moves further than the finger.
export function bandMoved(band: Band, share: number): Stretch {
  const distance = share * (msOf(band.range.endAt) - msOf(band.range.startAt));
  const step = moveStepMs(band);
  if (Math.abs(distance) < step / 2) {
    return movedBy(band, 0);
  }
  const start = msOf(band.startAt);
  const steps = (start + distance) / step;
  const snapped = distance > 0 ? Math.ceil(steps - 0.5) : Math.floor(steps + 0.5);
  return movedBy(band, snapped * step - start);
}

export function bandStepped(band: Band, direction: 1 | -1): Stretch {
  return movedBy(band, direction * stepMsOf(band));
}

// In lane order, and in each lane in the order of its stretches, which the main server sorts by time.
export function clashesAt(lanes: readonly Lane[], at: Stretch): Clash[] {
  return lanes.flatMap(({ userId, name, busy }) =>
    busy.flatMap((stretch) => {
      const startAt = msOf(stretch.startAt) < msOf(at.startAt) ? at.startAt : stretch.startAt;
      const endAt = msOf(stretch.endAt) > msOf(at.endAt) ? at.endAt : stretch.endAt;
      return msOf(startAt) < msOf(endAt) ? [{ userId, name, startAt, endAt, busy: stretch }] : [];
    }),
  );
}

export function absentNames(clashes: readonly Clash[]): string[] {
  return clashes
    .filter(({ userId }, index) => clashes.findIndex((clash) => clash.userId === userId) === index)
    .map(({ name }) => name);
}

// short-name's particle follows the last syllable's final consonant: 과 after one.
function endsClosed(word: string): boolean {
  return withParticle(word).endsWith('과');
}

// The condition chips while the band is moved whole: the time chip, the start the User fixed or else the end the
// answer used, says the band's start, and is the one `changed`.
export function chipsWhileMoved(
  chips: readonly ConditionChip[],
  at: Stretch | null,
): { chips: readonly ConditionChip[]; changed: ConditionChip | null } {
  const time = chips.find(({ kind }) => kind === 'from') ?? chips.find(({ kind }) => kind === 'until');
  if (at === null || time === undefined) {
    return { chips, changed: null };
  }
  const changed = { ...time, text: clockOf(at.startAt) };
  return { chips: chips.map((chip) => (chip === time ? changed : chip)), changed };
}

// The band's words and the card's lines while the band overlaps someone's busy stretch; null while it overlaps none.
// The User's lane is the first.
export function movingWords(lanes: readonly Lane[], at: Stretch): { text: string; lines: AnswerLine[] } | null {
  const clashes = clashesAt(lanes, at);
  const [first] = clashes;
  if (first === undefined) {
    return null;
  }
  const names = absentNames(clashes);
  const last = names.at(-1) ?? first.name;
  const who =
    names.length === 1 && first.userId === lanes[0]?.userId
      ? '내가'
      : `${names.join(', ')}${endsClosed(last) ? '이' : '가'}`;
  const reason = `${clockOf(first.busy.startAt)}부터 ${first.busy.label ?? '일정'}이라`;
  return {
    text: `${clockOf(at.startAt)}–${clockOf(at.endAt)} · ${who} 안 돼요`,
    lines: [
      [
        { text: first.name, strong: true },
        { text: `${endsClosed(first.name) ? '은' : '는'} ${reason}`, strong: false },
      ],
      [{ text: '이때는 만날 수 없어요', strong: false }],
    ],
  };
}
