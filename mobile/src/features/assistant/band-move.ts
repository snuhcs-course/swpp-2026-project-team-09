/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, TimeBand } from '@/api/assistant-types';
import { withParticle } from '@/features/map/short-name';

import { clockAt, clockOf, msOf, onBandDay, STEP_MS, type Stretch } from './time-band';

// The time band moved whole: its width kept, by whole steps of the distance moved, inside the range; and who cannot
// come in the time it covers.

type Band = Pick<TimeBand, 'range' | 'startAt' | 'endAt'>;
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
  const moved = Math.min(Math.max(start + distance, msOf(band.range.startAt)), msOf(band.range.endAt) - width);
  return { startAt: onBandDay(clockAt(moved), band), endAt: onBandDay(clockAt(moved + width), band) };
}

// `share` is the distance dragged as a share of the range's width; less than half a step moves nothing.
export function bandMoved(band: Band, share: number): Stretch {
  const distance = share * (msOf(band.range.endAt) - msOf(band.range.startAt));
  const steps = Math.sign(distance) * Math.floor(Math.abs(distance) / STEP_MS + 0.5);
  return movedBy(band, steps * STEP_MS);
}

export function bandStepped(band: Band, direction: 1 | -1): Stretch {
  return movedBy(band, direction * STEP_MS);
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
