/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Place, Weekday } from '@/api/types';

import { type Block, endIsUncertain, findBlocks } from './blocks';
import { type BlockLine, blockText, linesIn } from './block-text';
import { linkRoom } from './building';
import { mergeClasses, type ReadClass, type ReadTime } from './classes';
import { type Column, columnsFromGridLines, findHeader, horizontalLines } from './grid';
import { fitHourLabels, hourLabels, hoursAt, refineWithGridLines, rowAt, type TimeLine, timeLineOf } from './hours';
import type { NativeOcrResult } from './native-ocr';
import { decodePixels } from './pixels';
import { findTitle } from './title';
import { type Word, wordsOf } from './words';

// The reading pipeline: what the native OCR module returned for a screenshot of SNUTT or 에브리타임, turned into
// classes. Whatever is uncertain is left out, with the reason, rather than guessed.

// The confidence a block's name needs for its time and its class to be kept (Android). Chosen on the four reference
// screenshots, whose names read 0.56 and above: see accuracy.md.
export const NAME_CONFIDENCE = 0.5;

export type LeftOutReason =
  // The block's bottom runs under the tab bar, reaches the picture's end or fades out.
  | 'end-uncertain'
  // The block's top or bottom is outside the day.
  | 'outside-day'
  // No name was read in the block.
  | 'no-name'
  // The name was read with too little confidence (Android).
  | 'low-confidence'
  // Without confidence (iOS): the block holds only a room, or the name is a single character.
  | 'too-little-text';

export interface LeftOut {
  weekday: Weekday;
  name: string;
  // The times as far as they were read, "13:00", or null.
  start: string | null;
  end: string | null;
  reason: LeftOutReason;
}

export type Reading =
  | { kind: 'read'; title: string | null; classes: ReadClass[]; leftOut: LeftOut[] }
  // No timetable in the picture: no day columns, or fewer than 3 hour labels on one line.
  | { kind: 'none'; reason: 'no-columns' | 'no-hours' };

function clock(hours: number): string | null {
  const minutes = Math.round((hours * 60) / 5) * 5;
  if (minutes < 0 || minutes > 24 * 60) {
    return null;
  }
  const whole = Math.min(minutes, 24 * 60 - 1);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

interface Grid {
  columns: Column[];
  headerTop: number;
  headerBottom: number;
  line: TimeLine;
}

// ① The grid: the header's columns, or the grid lines' when no header was read; the hour labels' fitted line.
function readGrid(words: readonly Word[], image: ReturnType<typeof decodePixels>): Grid | 'no-columns' | 'no-hours' {
  const header = findHeader(words, image.width);
  const columns = header?.columns ?? columnsFromGridLines(image, image.height * 0.1, image.height * 0.9);
  const first = columns?.[0];
  const last = columns?.at(-1);
  if (columns === null || columns === undefined || first === undefined || last === undefined) {
    return 'no-columns';
  }
  const labels = hourLabels(words, first.left, header?.bottom ?? image.height * 0.06);
  const fitted = fitHourLabels(labels, image.height);
  if (fitted === null) {
    return 'no-hours';
  }
  const gridLines = horizontalLines(image, first.left, last.right);
  const shifted = timeLineOf(fitted.fit.line, labels, fitted.hours, fitted.fit.inliers, gridLines);
  // Without a header, the grid starts an hour above the first label that fits.
  const firstHour = Math.min(...fitted.fit.inliers.map((index) => fitted.hours[index] ?? 24));
  const headerBottom = header?.bottom ?? rowAt(shifted, firstHour - 1);
  return {
    columns,
    headerTop: header?.top ?? headerBottom - shifted.a / 2,
    headerBottom,
    line: refineWithGridLines(shifted, gridLines, headerBottom),
  };
}

// Two same-coloured blocks stacked with no line between them: the text falls into two groups far apart that read the
// same name. The block is split where the second group starts, less the first group's distance from the block's top.
function splitByText(block: Block, lines: readonly BlockLine[], hourHeight: number): Block[] {
  for (let index = 1; index < lines.length; index += 1) {
    const above = lines.slice(0, index);
    const below = lines.slice(index);
    const gap = (below[0]?.y ?? 0) - (above.at(-1)?.y ?? 0);
    const one = blockText(above).name.replaceAll(/\s+/gu, '');
    const other = blockText(below).name.replaceAll(/\s+/gu, '');
    if (gap > hourHeight * 0.5 && one !== '' && one === other) {
      const cut = Math.round((below[0]?.y ?? 0) - ((above[0]?.y ?? 0) - block.y0));
      if (cut > block.y0 && cut < block.y1) {
        return [
          { ...block, y1: cut },
          { ...block, y0: cut },
        ];
      }
    }
  }
  return [block];
}

interface ReadBlock {
  name: string;
  confidence: number | null;
  time: ReadTime;
}

// ③④⑦ One block's time, name and room, or why it is left out.
function readBlock(
  block: Block,
  words: readonly Word[],
  grid: Grid,
  places: readonly Place[],
  uncertainEnd: boolean,
): ReadBlock | LeftOut {
  const text = blockText(linesIn(words, block));
  const start = clock(hoursAt(grid.line, block.y0));
  const end = clock(hoursAt(grid.line, block.y1));
  const leftOut = (reason: LeftOutReason): LeftOut => ({
    weekday: block.column.weekday,
    name: text.name,
    start,
    end,
    reason,
  });
  if (text.name === '') {
    return leftOut('no-name');
  }
  if (start === null || end === null || start >= end) {
    return leftOut('outside-day');
  }
  if (uncertainEnd) {
    return leftOut('end-uncertain');
  }
  if (text.nameConfidence === null) {
    if (text.nameLines === 0 || Array.from(text.name.replaceAll(/\s+/gu, '')).length < 2) {
      return leftOut('too-little-text');
    }
  } else if (text.nameConfidence < NAME_CONFIDENCE) {
    return leftOut('low-confidence');
  }
  const link = linkRoom(text.room, places);
  return {
    name: text.name,
    confidence: text.nameConfidence,
    time: { weekday: block.column.weekday, start, end, room: link?.room ?? null, placeId: link?.placeId ?? null },
  };
}

// Reads a screenshot's timetable, with what was left out and why. `places` are the campus Places (`GET /places`),
// for linking rooms to buildings.
export function readScreenshot(result: NativeOcrResult, places: readonly Place[]): Reading {
  const image = decodePixels(result.pixels);
  const words = wordsOf(result);
  const grid = readGrid(words, image);
  if (typeof grid === 'string') {
    return { kind: 'none', reason: grid };
  }
  const read: ReadBlock[] = [];
  const leftOut: LeftOut[] = [];
  for (const found of findBlocks(image, grid.columns, grid.line.a, grid.headerBottom)) {
    const uncertainEnd = endIsUncertain(image, found);
    const pieces = splitByText(found, linesIn(words, found), grid.line.a);
    pieces.forEach((block, index) => {
      // Only the last piece reaches the found block's bottom.
      const outcome = readBlock(block, words, grid, places, uncertainEnd && index === pieces.length - 1);
      if ('reason' in outcome) {
        leftOut.push(outcome);
      } else {
        read.push(outcome);
      }
    });
  }
  const title = findTitle(result.lines, result.height, grid.headerTop * result.pixels.scale);
  return { kind: 'read', title, classes: mergeClasses(read), leftOut };
}

// The seam with the import (ticket 04): what one image's OCR becomes, in the spec's shape ("Reading pipeline",
// "Output"). Pure: the same OCR and Places give the same classes on Android and iOS. What is uncertain is left out;
// a picture without a timetable gives no classes.

export type OcrResult = NativeOcrResult;

export type { ReadClass, ReadTime };

export interface ReadTable {
  // The screenshot's title, which names the new version, or null.
  title: string | null;
  classes: ReadClass[];
}

export type ReadTimetable = (ocr: OcrResult, places: readonly Place[]) => ReadTable;

export const readTimetable: ReadTimetable = (ocr, places) => {
  const reading = readScreenshot(ocr, places);
  return reading.kind === 'read' ? { title: reading.title, classes: reading.classes } : { title: null, classes: [] };
};
