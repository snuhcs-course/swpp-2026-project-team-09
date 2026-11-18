/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { axisHours, blockTimes, clock, dayOf, LETTERS, minutesOf, WEEKDAYS } from './labels.js';
import { type GridTextAnswer, type ListedBlock, type ModelAnswer, type TextAnswer } from './reading-model.js';
import { blocksAnswer } from './second-look.js';

// P15-52: the blocks the phone found from the pixels (each block's day column and its top and bottom in pixels),
// put together with what the model read of the layout (each block's day label and rough start and end against the
// hour axis). The
// pixels place every block exactly but name no day or hour; the model names them but places edges only roughly. So
// the code fits one line from pixels to minutes through all the model's times, which a few misread times cannot
// move, and takes every block's times from the pixels on that line; and it gives each column the day that most of
// its blocks were read with, the columns' days running on by one. When the fit or the days do not hold, the mapping
// is refused and the model reads the whole picture instead. The blocks' text is read in a second call, on the days
// and times placed here (`askForBlockText`), so that no text is taken for the wrong block.

export interface GridBlockFound {
  column: number;
  top: number;
  bottom: number;
  colour: [number, number, number] | null;
  fades?: boolean;
}

export interface GridFound {
  columns: number;
  blocks: GridBlockFound[];
}

// How far, in minutes, a model's time may be from the fitted line and still count for it; how far from that first fit
// it may be and count for the second (P15-52 review: a time 5 to 12 minutes off pulled the first fit by 5 minutes on
// one saved reading); and how far the middle of all its times may be.
const INLIER_MINUTES = 12;
const REFIT_MINUTES = 5;
const MEDIAN_MINUTES = 4;

interface Point {
  y: number;
  minutes: number;
}

type Line = { slope: number; offset: number };

// The least-squares line through the points.
function leastSquares(points: readonly Point[]): Line {
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const meanM = points.reduce((sum, point) => sum + point.minutes, 0) / points.length;
  const spread = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
  const slope = points.reduce((sum, point) => sum + (point.y - meanY) * (point.minutes - meanM), 0) / spread;
  return { slope, offset: meanM - slope * meanY };
}

const offBy = (line: Line, point: Point): number => Math.abs(line.slope * point.y + line.offset - point.minutes);

// minutes = slope × y + offset through the most points within INLIER_MINUTES, refitted by least squares over them, and
// once more over those within REFIT_MINUTES of that fit when at least 4 are. Every pair of points proposes a line, so
// the result does not depend on chance. Null with fewer than 4 points agreeing, or fewer than 60 % of them, a line
// running backwards, or times whose median is more than 4 minutes off it.
export function fitMinutes(points: readonly Point[]): Line | null {
  let best: Point[] = [];
  for (const [index, one] of points.entries()) {
    for (const other of points.slice(index + 1)) {
      if (Math.abs(other.y - one.y) < 1) {
        continue;
      }
      const slope = (other.minutes - one.minutes) / (other.y - one.y);
      const offset = one.minutes - slope * one.y;
      const inliers = points.filter((point) => Math.abs(slope * point.y + offset - point.minutes) <= INLIER_MINUTES);
      if (slope > 0 && inliers.length > best.length) {
        best = inliers;
      }
    }
  }
  if (best.length < 4 || best.length < points.length * 0.6) {
    return null;
  }
  const first = leastSquares(best);
  const close = best.filter((point) => offBy(first, point) <= REFIT_MINUTES);
  const { slope, offset } =
    close.length >= 4 && new Set(close.map(({ y }) => y)).size > 1 ? leastSquares(close) : first;
  // The model's times sit on the line when it read them with care: on the nine screenshots their median distance from
  // it was at most 2 minutes, and above 9 when the model read them without thinking first, which placed every block
  // 10 to 25 minutes off (accuracy.md). A line the times do not sit on is no line.
  const residuals = points.map((point) => offBy({ slope, offset }, point)).toSorted((x, y) => x - y);
  const median = residuals[Math.floor(residuals.length / 2)] ?? Infinity;
  return slope > 0 && median <= MEDIAN_MINUTES ? { slope, offset } : null;
}

// The day of each column: day₀ + column, where day₀ is what most blocks' day labels say once their column is taken
// off. Null when fewer than 60 % of the blocks whose day was read agree, or the week would run past Sunday.
export function columnDays(votes: readonly { column: number; label: string }[], columns: number): string[] | null {
  const starts = votes.flatMap(({ column, label }) => {
    const weekday = dayOf(label);
    return weekday === null ? [] : [WEEKDAYS.indexOf(weekday) - column];
  });
  const counts = new Map<number, number>();
  for (const start of starts) {
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  const [start, count] = [...counts].toSorted((one, other) => other[1] - one[1])[0] ?? [0, 0];
  if (starts.length === 0 || count < starts.length * 0.6 || start < 0 || start + columns > WEEKDAYS.length) {
    return null;
  }
  return Array.from({ length: columns }, (_, column) => LETTERS[WEEKDAYS[start + column] ?? 'monday']);
}

const snap = (minutes: number): number => Math.round(minutes / 5) * 5;

// Each found block placed: its day from its column, its start and where its colour is last seen from the pixels on
// the fitted line, and the end the model read (24-hour), for a fading block's rule. Null when the mapping does not
// hold.
export interface Placed {
  day: string;
  start: string;
  seen: string;
  modelEnd: string | null;
}

export function placedBlocks(found: GridFound, text: GridTextAnswer): Placed[] | null {
  const hours = axisHours(text.axis);
  if (hours === null) {
    return null;
  }
  const read = found.blocks.map((_, index) => text.blocks.find(({ number }) => number === index + 1));
  const points = found.blocks.flatMap((block, index): Point[] => {
    const one = read[index];
    const times =
      one === undefined
        ? null
        : blockTimes(minutesOf(one.start, text.axis, hours), minutesOf(one.end, text.axis, hours));
    if (times === null) {
      return [];
    }
    const top = { y: block.top, minutes: times[0] };
    return block.fades === true ? [top] : [top, { y: block.bottom, minutes: times[1] }];
  });
  const line = fitMinutes(points);
  const days = columnDays(
    found.blocks.flatMap((block, index) => {
      const label = read[index]?.day ?? null;
      return label === null ? [] : [{ column: block.column, label }];
    }),
    found.columns,
  );
  if (line === null || days === null) {
    return null;
  }
  return found.blocks.map((block, index) => ({
    day: days[block.column] ?? '',
    start: clock(snap(line.slope * block.top + line.offset)),
    seen: clock(snap(line.slope * block.bottom + line.offset)),
    modelEnd: modelEnd(read[index]?.end ?? '', text.axis, hours),
  }));
}

// The found blocks as listed for the model to read their text: each one's day, start and where its colour is last
// seen, on a 24-hour clock, a fading one marked so that its end is asked for too.
export function gridListed(found: GridFound, placed: readonly Placed[]): ListedBlock[] {
  return found.blocks.map((block, index) => {
    const place = placed[index];
    return { day: place?.day ?? '', start: place?.start ?? '', end: place?.seen ?? '', fades: block.fades === true };
  });
}

// How far, in minutes, the end the model read may be from where a fading block's colour is last seen and still agree.
const FADE_AGREEMENT = 5;

const minutesOfClock = (text: string): number => {
  const [hours = 0, minutes = 0] = text.split(':').map(Number);
  return hours * 60 + minutes;
};

// The end of a block: where its colour is last seen, from the pixels; for a fading block only when the end the model
// read with the layout agrees with it within FADE_AGREEMENT minutes, else null, and the block is left out as cut. Of
// the rules measured on fading blocks (accuracy.md), this one turned no block left out into a wrong time: a bar or a
// fade can stop the colour at a usual end (20:50) while the class runs on, and the model's reading alone was wrong
// there more often than right.
export function placedEnd(block: GridBlockFound, place: Placed): string | null {
  if (block.fades !== true) {
    return place.seen;
  }
  const agrees =
    place.modelEnd !== null && Math.abs(minutesOfClock(place.modelEnd) - minutesOfClock(place.seen)) <= FADE_AGREEMENT;
  return agrees ? place.seen : null;
}

// The answer on the found blocks: days and times as placed, text as the model read it on those days and times
// (`text`, of `askForBlockText` on `gridListed`), a fading block left out as cut when its end does not hold.
export function placedAnswer(found: GridFound, placed: readonly Placed[], text: TextAnswer): ModelAnswer {
  const listed = gridListed(found, placed);
  const answer = blocksAnswer(
    listed.map(({ day, start, end }) => ({ day, start, end })),
    text,
  );
  return {
    ...answer,
    blocks: answer.blocks.map((block, index) => {
      const place = placed[index];
      const foundBlock = found.blocks[index];
      const end = place === undefined || foundBlock === undefined ? null : placedEnd(foundBlock, place);
      const { day, start, nameLines, name, room } = block;
      return { day, start, end: end ?? block.end, nameLines, name, room, cut: end === null };
    }),
  };
}

// The model's end of a block as a 24-hour clock, its latest reading where a 12-hour axis allows two.
function modelEnd(end: string, axis: readonly string[], hours: readonly number[]): string | null {
  const candidates = minutesOf(end, axis, hours);
  const latest = candidates.at(-1);
  return latest === undefined ? null : clock(latest);
}
