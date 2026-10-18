/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Place, Weekday } from '@/api/types';
import type { ReadClass, ReadTime } from '@/features/timetable-ocr/classes';
import type { NativeOcrResult } from '@/features/timetable-ocr/native-ocr';
import type { LeftOut } from '@/features/timetable-ocr/read-timetable';

import seed from '../../../main-server/seed/campus-map-places.json';
import everytime1 from '../fixtures/timetable-ocr/everytime-1.json';
import everytime1Truth from '../fixtures/timetable-ocr/everytime-1.truth.json';
import snutt1 from '../fixtures/timetable-ocr/snutt-1.json';
import snutt1Truth from '../fixtures/timetable-ocr/snutt-1.truth.json';
import snutt2 from '../fixtures/timetable-ocr/snutt-2.json';
import snutt2Truth from '../fixtures/timetable-ocr/snutt-2.truth.json';
import snutt3 from '../fixtures/timetable-ocr/snutt-3.json';
import snutt3Truth from '../fixtures/timetable-ocr/snutt-3.truth.json';

// The reference screenshots' saved OCR outputs, their hand-written ground truth, the campus Places, and the
// comparison that accuracy.md reports.

export const SCREENSHOTS = ['everytime-1', 'snutt-1', 'snutt-2', 'snutt-3'] as const;
export type Screenshot = (typeof SCREENSHOTS)[number];

const OUTPUTS: Record<Screenshot, NativeOcrResult> = {
  'everytime-1': everytime1,
  'snutt-1': snutt1,
  'snutt-2': snutt2,
  'snutt-3': snutt3,
};

export interface TruthTime {
  weekday: Weekday;
  start: string;
  end: string;
  name: string;
  // The room as printed, "302-311-1", its building's number and the rest; null where the block has none.
  roomLine: string | null;
  building: string | null;
  room: string | null;
}

export interface Truth {
  title: string | null;
  times: TruthTime[];
}

const WEEK: readonly Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function weekday(text: string): Weekday {
  const found = WEEK.find((day) => day === text);
  if (found === undefined) {
    throw new Error(`not a weekday: ${text}`);
  }
  return found;
}

function truthOf(raw: { title: string | null; times: (Omit<TruthTime, 'weekday'> & { weekday: string })[] }): Truth {
  return { title: raw.title, times: raw.times.map((time) => ({ ...time, weekday: weekday(time.weekday) })) };
}

const TRUTHS: Record<Screenshot, Truth> = {
  'everytime-1': truthOf(everytime1Truth),
  'snutt-1': truthOf(snutt1Truth),
  'snutt-2': truthOf(snutt2Truth),
  'snutt-3': truthOf(snutt3Truth),
};

export function ocrOutput(name: Screenshot): NativeOcrResult {
  return OUTPUTS[name];
}

export function truth(name: Screenshot): Truth {
  return TRUTHS[name];
}

// The same output as iOS would give it: no confidence anywhere.
export function withoutConfidence(result: NativeOcrResult): NativeOcrResult {
  return {
    ...result,
    lines: result.lines.map((line) => ({
      ...line,
      confidence: null,
      elements: line.elements.map((element) => ({ ...element, confidence: null })),
    })),
  };
}

// The main server's seed of campus Places (`main-server/seed/campus-map-places.json`, from map.snu.ac.kr), one per
// building number, as `GET /places` lists them.
export function campusPlaces(): Place[] {
  const places = new Map<string, Place>();
  for (const row of seed.rows) {
    const number = row.vil_dong_nm;
    if (number !== null && number !== '' && !places.has(number)) {
      places.set(number, {
        id: `place-${number}`,
        number,
        name: row.inst_kor_nm,
        latitude: Number(row.lat_val),
        longitude: Number(row.lon_val),
      });
    }
  }
  return [...places.values()];
}

function minutes(clock: string): number {
  const [hours, mins] = clock.split(':').map(Number);
  return (hours ?? 0) * 60 + (mins ?? 0);
}

export function editDistance(one: string, other: string): number {
  const a = Array.from(one);
  const b = Array.from(other);
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const replace = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, replace));
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

const bare = (text: string): string => text.replaceAll(/\s+/gu, '');

export interface Score {
  truthTimes: number;
  readTimes: number;
  matched: number;
  truthClasses: number;
  readClasses: number;
  classesFound: number;
  classesReal: number;
  dayRight: number;
  startWithin5: number;
  endWithin5: number;
  // Character edits and characters of the true names over the matched times, spaces removed.
  nameEdits: number;
  nameCharacters: number;
  // The same with the spaces kept, as the class's name shows them.
  spacedEdits: number;
  spacedCharacters: number;
  roomsTrue: number;
  roomsExact: number;
  buildingsRight: number;
  buildingsWrong: number;
  buildingsUnlinked: number;
  missed: { time: TruthTime; why: string }[];
  extra: string[];
}

interface Read {
  name: string;
  time: ReadTime;
  index: number;
}

interface Pair {
  read: Read;
  truth: TruthTime;
}

// Each time read is matched to an unmatched true time that it overlaps by more than a third and whose name it reads
// with at most half the characters wrong, the same day first.
function match(read: readonly Read[], expected: readonly TruthTime[]): Pair[] {
  const pairs: Pair[] = [];
  const open = new Set(expected);
  for (const one of read) {
    const [start, end] = [minutes(one.time.start), minutes(one.time.end)];
    const candidates = [...open]
      .map((time) => {
        const overlap = Math.min(end, minutes(time.end)) - Math.max(start, minutes(time.start));
        const union = Math.max(end, minutes(time.end)) - Math.min(start, minutes(time.start));
        const cer = editDistance(bare(one.name), bare(time.name)) / Math.max(1, bare(time.name).length);
        return { time, overlap: overlap / union, cer };
      })
      .filter(({ overlap, cer }) => overlap > 1 / 3 && cer <= 0.5)
      .toSorted(
        (a, b) =>
          Number(b.time.weekday === one.time.weekday) - Number(a.time.weekday === one.time.weekday) ||
          b.overlap - a.overlap,
      );
    const best = candidates[0];
    if (best !== undefined) {
      open.delete(best.time);
      pairs.push({ read: one, truth: best.time });
    }
  }
  return pairs;
}

// Adds one matched time's day, times, name, room and building to the score.
function tally(result: Score, { read: one, truth: time }: Pair): void {
  result.dayRight += Number(one.time.weekday === time.weekday);
  result.startWithin5 += Number(Math.abs(minutes(one.time.start) - minutes(time.start)) <= 5);
  result.endWithin5 += Number(Math.abs(minutes(one.time.end) - minutes(time.end)) <= 5);
  result.nameEdits += editDistance(bare(one.name), bare(time.name));
  result.nameCharacters += bare(time.name).length;
  result.spacedEdits += editDistance(one.name, time.name);
  result.spacedCharacters += time.name.length;
  const building = one.time.placeId?.replace(/^place-/u, '') ?? null;
  if (time.roomLine !== null) {
    const roomRead = building === null ? null : [building, one.time.room].filter((part) => part !== null).join('-');
    result.roomsTrue += 1;
    result.roomsExact += Number(roomRead === time.roomLine);
  }
  if (building === null) {
    result.buildingsUnlinked += Number(time.building !== null);
  } else if (building === time.building && one.time.room === time.room) {
    result.buildingsRight += 1;
  } else {
    result.buildingsWrong += 1;
  }
}

export function score(classes: readonly ReadClass[], leftOut: readonly LeftOut[], expected: Truth): Score {
  const read = classes.flatMap((lesson, index) => lesson.times.map((time) => ({ name: lesson.name, time, index })));
  const pairs = match(read, expected.times);
  const matchedTruth = new Set(pairs.map((pair) => pair.truth));
  const matchedRead = new Set(pairs.map((pair) => pair.read));
  const result: Score = {
    truthTimes: expected.times.length,
    readTimes: read.length,
    matched: pairs.length,
    truthClasses: new Set(expected.times.map((time) => bare(time.name))).size,
    readClasses: classes.length,
    classesFound: new Set(pairs.map((pair) => bare(pair.truth.name))).size,
    classesReal: new Set(pairs.map((pair) => pair.read.index)).size,
    dayRight: 0,
    startWithin5: 0,
    endWithin5: 0,
    nameEdits: 0,
    nameCharacters: 0,
    spacedEdits: 0,
    spacedCharacters: 0,
    roomsTrue: 0,
    roomsExact: 0,
    buildingsRight: 0,
    buildingsWrong: 0,
    buildingsUnlinked: 0,
    missed: expected.times
      .filter((time) => !matchedTruth.has(time))
      .map((time) => ({
        time,
        why: leftOut.find((out) => out.weekday === time.weekday && out.start === time.start)?.reason ?? 'not found',
      })),
    extra: read
      .filter((one) => !matchedRead.has(one))
      .map((one) => `${one.name} ${one.time.weekday} ${one.time.start}–${one.time.end}`),
  };
  for (const pair of pairs) {
    tally(result, pair);
  }
  return result;
}
