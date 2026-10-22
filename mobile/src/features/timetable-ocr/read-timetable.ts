/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Place, Weekday } from '@/api/types';

import { type Block, endIsUncertain, findBlocks, type HeaderBand, headerBandOf, startIsUncertain } from './blocks';
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
// classes. Whatever is uncertain is left out, with the reason, rather than guessed. What is kept is decided by the
// grid, the blocks' geometry and whether text is there, never by ML Kit's confidence, so that Android and iOS (which
// gives none) follow the same rules.

export type LeftOutReason =
  // The block's bottom runs under the tab bar, reaches the picture's end or fades out.
  | 'end-uncertain'
  // The block's top is cut by the picture's top or a bar over it, or fades in: the timetable was scrolled.
  | 'start-uncertain'
  // The block is one of two classes drawn side by side in one column, each narrower than it: they overlap in time.
  | 'too-narrow'
  // The block's top or bottom is outside the day.
  | 'outside-day'
  // No name was read in the block: no text, only a room, or only marks without a letter or digit.
  | 'no-name';

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
  // Whether the day header was read; without it the header's place is a guess.
  header: boolean;
  headerTop: number;
  headerBottom: number;
  line: TimeLine;
  // The first hour whose label fits the line.
  firstHour: number;
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
    header: header !== null,
    headerTop: header?.top ?? headerBottom - shifted.a / 2,
    headerBottom,
    line: refineWithGridLines(shifted, gridLines, headerBottom),
    firstHour,
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
  cut: boolean;
  marked: boolean;
  time: ReadTime;
}

// ③④⑦ One block's time, name and room, or why it is left out.
function readBlock(
  block: Block,
  words: readonly Word[],
  grid: Grid,
  places: readonly Place[],
  uncertain: 'start-uncertain' | 'end-uncertain' | 'too-narrow' | null,
): ReadBlock | LeftOut {
  const text = blockText(linesIn(words, block), block);
  const start = clock(hoursAt(grid.line, block.y0));
  const end = clock(hoursAt(grid.line, block.y1));
  const leftOut = (reason: LeftOutReason): LeftOut => ({
    weekday: block.column.weekday,
    name: text.name,
    start,
    end,
    reason,
  });
  if (!/[\p{L}\p{N}]/u.test(text.name)) {
    return leftOut('no-name');
  }
  if (start === null || end === null || start >= end) {
    return leftOut('outside-day');
  }
  if (uncertain !== null) {
    return leftOut(uncertain);
  }
  const link = linkRoom(text.room, places);
  return {
    name: text.name,
    cut: text.cut,
    marked: text.marked,
    time: { weekday: block.column.weekday, start, end, room: link?.room ?? null, placeId: link?.placeId ?? null },
  };
}

// The day header's band, sampled on its letters' row, and the first hour's row below it; null when no header was read,
// since its place is then a guess.
function bandOf(image: ReturnType<typeof decodePixels>, grid: Grid): HeaderBand | null {
  const colour = grid.header
    ? headerBandOf(
        image,
        (grid.headerTop + grid.headerBottom) / 2,
        grid.columns[0]?.left ?? 0,
        grid.columns.at(-1)?.right ?? image.width,
      )
    : null;
  return colour === null ? null : { colour, firstHourRow: rowAt(grid.line, grid.firstHour) };
}

// Reads a screenshot's timetable, with what was left out and why. `places` are the campus Places (`GET /places`),
// for linking rooms to buildings. The import (ticket 04) calls this.
export function readTimetable(result: NativeOcrResult, places: readonly Place[]): Reading {
  const image = decodePixels(result.pixels);
  const words = wordsOf(result);
  const grid = readGrid(words, image);
  if (typeof grid === 'string') {
    return { kind: 'none', reason: grid };
  }
  const read: ReadBlock[] = [];
  const leftOut: LeftOut[] = [];
  // A nameless piece cut at the header's bottom is the header's tinted band reaching below its letters: no class, and
  // no block for another's edge to meet.
  const blocks = findBlocks(image, grid.columns, grid.line.a, grid.headerBottom).filter(
    (found) => found.clippedTop !== true || blockText(linesIn(words, found)).name !== '',
  );
  const headerBand = bandOf(image, grid);
  for (const found of blocks) {
    if (found.narrow === true) {
      // Reported with its name; a narrow coloured shape without text (an icon) is no class.
      const outcome = readBlock(found, words, grid, places, 'too-narrow');
      if ('reason' in outcome && outcome.reason !== 'no-name') {
        leftOut.push(outcome);
      }
      continue;
    }
    const uncertainStart = startIsUncertain(image, found, blocks, headerBand);
    const uncertainEnd = endIsUncertain(image, found, blocks);
    const pieces = splitByText(found, linesIn(words, found), grid.line.a);
    pieces.forEach((block, index) => {
      // Only the first piece reaches the found block's top, and only the last its bottom.
      const uncertain =
        uncertainStart && index === 0
          ? 'start-uncertain'
          : uncertainEnd && index === pieces.length - 1
            ? 'end-uncertain'
            : null;
      const outcome = readBlock(block, words, grid, places, uncertain);
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
