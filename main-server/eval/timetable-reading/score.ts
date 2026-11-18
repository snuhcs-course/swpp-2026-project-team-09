/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { WEEKDAYS } from '../../src/timetable-reading/labels.ts';
import { type ReadTime, type TimetableReading } from '../../src/timetable-reading/reading-checks.ts';

// P15-52: a reading of a screenshot compared with its hand-written ground truth (`mobile/__tests__/fixtures/
// timetable-ocr/<name>.truth.json`, or `synthetic/<name>.truth.json`), counted as accuracy.md reports it.

export const SCREENSHOTS = [
  'everytime-1',
  'snutt-1',
  'snutt-2',
  'snutt-3',
  'everytime-2',
  'everytime-dark-1',
  'snutt-4',
  'snutt-dark-1',
  'snutt-grey-1',
] as const;

// The synthetic timetables (synthetic/make.py): a generality check in other layouts, outside the acceptance bar.
export const SYNTHETIC_NAMES = ['synthetic-saturday', 'synthetic-english', 'synthetic-ampm', 'synthetic-week'] as const;

// Synthetic blocks whose end is not where their colour is last seen (a bar over them, a fade): the fading-end rule's
// check that a block left out is never turned into a wrong time.
export const FADE_NAMES = ['synthetic-fades', 'synthetic-fades-2'] as const;

const FIXTURES = new URL('../../../mobile/__tests__/fixtures/timetable-ocr/', import.meta.url);
const SYNTHETIC = new URL('synthetic/', import.meta.url);

export function namesOf(withSynthetic: boolean): string[] {
  return [...SCREENSHOTS, ...(withSynthetic ? [...SYNTHETIC_NAMES, ...FADE_NAMES] : [])];
}

function folderOf(name: string): URL {
  return name.startsWith('synthetic-') ? SYNTHETIC : FIXTURES;
}

// The picture of a screenshot, or null when its PNG is missing.
export function imageOf(name: string): { data: Uint8Array; mediaType: string } | null {
  const file = new URL(`${name}.png`, folderOf(name));
  return existsSync(file) ? { data: readFileSync(file), mediaType: 'image/png' } : null;
}

const truthSchema = z.object({
  title: z.string().nullable(),
  times: z.array(
    z.object({
      weekday: z.enum(WEEKDAYS),
      start: z.string(),
      end: z.string(),
      name: z.string(),
      roomLine: z.string().nullable(),
    }),
  ),
});

export type Truth = z.infer<typeof truthSchema>;
export type TruthTime = Truth['times'][number];

export function truthOf(name: string): Truth {
  return truthSchema.parse(JSON.parse(readFileSync(new URL(`${name}.truth.json`, folderOf(name)), 'utf8')));
}

export interface ReadingScore {
  truthTimes: number;
  readTimes: number;
  // Times read on a true time's day that overlap it by more than a third.
  found: number;
  // Of those, start and end within 5 minutes.
  timesRight: number;
  // Of those, start and end exactly the true ones (the reading's times are snapped to 5 minutes, as the truth is).
  timesExact: number;
  namesExact: number;
  roomsExact: number;
  // Found with the time, the name and the room all right.
  allRight: number;
  // Times read that match no true time: a class or a time that is not on the picture, or a wrong day.
  invented: number;
  // True classes whose found times all sit in one class read, alone.
  classesGroupedRight: number;
  truthClasses: number;
  leftOut: number;
  titleRight: boolean;
  wrong: string[];
}

interface ReadOne {
  name: string;
  time: ReadTime;
  index: number;
}

interface Pair {
  read: ReadOne;
  truth: TruthTime;
}

function minutes(clock: string): number {
  const [hours = 0, mins = 0] = clock.split(':').map(Number);
  return hours * 60 + mins;
}

// The true time of the same day a time read overlaps most, by more than a third.
function matchOf(one: ReadOne, open: ReadonlySet<TruthTime>): TruthTime | undefined {
  const [start, end] = [minutes(one.time.start), minutes(one.time.end)];
  return [...open]
    .filter((time) => time.weekday === one.time.weekday)
    .map((time) => ({
      time,
      overlap:
        (Math.min(end, minutes(time.end)) - Math.max(start, minutes(time.start))) /
        (Math.max(end, minutes(time.end)) - Math.min(start, minutes(time.start))),
    }))
    .filter(({ overlap }) => overlap > 1 / 3)
    .toSorted((a, b) => b.overlap - a.overlap)[0]?.time;
}

// What is wrong about one found time: its time, its name or its room.
function faultsOf({ read: one, truth: time }: Pair): string[] {
  const what = `${time.name} ${time.weekday} ${time.start}–${time.end} ${time.roomLine ?? '-'}`;
  const timeRight =
    Math.abs(minutes(one.time.start) - minutes(time.start)) <= 5 &&
    Math.abs(minutes(one.time.end) - minutes(time.end)) <= 5;
  return [
    ...(timeRight ? [] : [`time: ${what} read ${one.time.start}–${one.time.end}`]),
    ...(one.name === time.name ? [] : [`name: ${what} read "${one.name}"`]),
    ...(one.time.room === time.roomLine ? [] : [`room: ${what} read ${one.time.room ?? '-'}`]),
  ];
}

// The true classes whose found times all sit in one class read, which holds no other.
function groupedRight(pairs: readonly Pair[], names: readonly string[]): number {
  return names.filter((name) => {
    const indexes = new Set(pairs.filter((pair) => pair.truth.name === name).map((pair) => pair.read.index));
    const [only] = indexes;
    return indexes.size === 1 && pairs.every((pair) => pair.read.index !== only || pair.truth.name === name);
  }).length;
}

export function scoreReading(reading: TimetableReading, truth: Truth): ReadingScore {
  const read =
    reading.kind === 'read'
      ? reading.classes.flatMap((lesson, index) => lesson.times.map((time) => ({ name: lesson.name, time, index })))
      : [];
  const open = new Set(truth.times);
  const pairs: Pair[] = [];
  const wrong: string[] = [];
  for (const one of read) {
    const match = matchOf(one, open);
    if (match === undefined) {
      wrong.push(`invented: ${one.name} ${one.time.weekday} ${one.time.start}–${one.time.end}`);
    } else {
      open.delete(match);
      pairs.push({ read: one, truth: match });
    }
  }
  const faults = pairs.map((pair) => faultsOf(pair));
  wrong.push(
    ...faults.flat(),
    ...[...open].map((time) => `missed: ${time.name} ${time.weekday} ${time.start}–${time.end}`),
  );
  const names = [...new Set(truth.times.map((time) => time.name))];
  const count = (prefix: string): number =>
    faults.filter((list) => !list.some((fault) => fault.startsWith(prefix))).length;
  return {
    truthTimes: truth.times.length,
    readTimes: read.length,
    found: pairs.length,
    timesRight: count('time:'),
    timesExact: pairs.filter(({ read: one, truth: time }) => one.time.start === time.start && one.time.end === time.end)
      .length,
    namesExact: count('name:'),
    roomsExact: count('room:'),
    allRight: faults.filter((list) => list.length === 0).length,
    invented: read.length - pairs.length,
    classesGroupedRight: groupedRight(pairs, names),
    truthClasses: names.length,
    leftOut: reading.kind === 'read' ? reading.leftOut.length : 0,
    titleRight: (reading.kind === 'read' ? reading.title : null) === truth.title,
    wrong,
  };
}
