/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type Model } from '../assistant/adapter.js';
import { type GridFound, gridListed, type Placed, placedAnswer, placedBlocks, placedEnd } from './grid-mapping.js';
import { axisHours, minutesOf } from './labels.js';
import {
  askForBlockText,
  askForEnd,
  askForGridText,
  askForIdText,
  type IdTextAnswer,
  type ListedBlock,
  type ModelAnswer,
  type ReadingLimits,
  type TextAnswer,
  type TimetableImage,
} from './reading-model.js';

// P15-52: reading a screenshot on the grid the phone found. How the calls are made is set by `GridOptions`, so that
// the experiment can measure each way (accuracy.md); the server uses DEFAULT_GRID_OPTIONS.

export interface GridOptions {
  // Whether the layout call may think first.
  layoutThinking: boolean;
  // Whether the text is read at the same time as the layout, the blocks named by column and place, and checked
  // against the placed starts afterwards; else it is read after, on the placed days and times.
  parallel: boolean;
  // Whether a fading block whose end the layout call read differently from where its colour ends is asked about once
  // more, on its own.
  fadeReask: boolean;
}

export const DEFAULT_GRID_OPTIONS: GridOptions = { layoutThinking: true, parallel: true, fadeReask: true };

// How far, in minutes, the start the text call read may be from the placed start for its text to count as that
// block's.
const START_AGREEMENT = 20;

function minutesOfClock(text: string): number {
  const [hours = 0, minutes = 0] = text.split(':').map(Number);
  return hours * 60 + minutes;
}

// The text read by column and place, kept for the blocks whose start it read near the placed start; the others are
// read again on their placed days and times.
async function checkedIdText(
  read: { model: Model; image: TimetableImage; limits: ReadingLimits },
  idText: IdTextAnswer,
  axis: readonly string[],
  placed: readonly Placed[],
  listed: readonly ListedBlock[],
): Promise<{ text: TextAnswer; again: number }> {
  const hours = axisHours(axis) ?? [];
  const kept: TextAnswer['blocks'] = [];
  const missing: number[] = [];
  placed.forEach((place, index) => {
    const one = idText.blocks.find(({ number }) => number === index + 1);
    const near =
      one !== undefined &&
      one.name.trim() !== '' &&
      minutesOf(one.start, axis, hours).some(
        (minutes) => Math.abs(minutes - minutesOfClock(place.start)) <= START_AGREEMENT,
      );
    if (near) {
      kept.push({ number: index + 1, nameLines: one.nameLines, name: one.name, room: one.room });
    } else {
      missing.push(index);
    }
  });
  if (missing.length > 0) {
    const again = missing.flatMap((index) => {
      const one = listed[index];
      return one === undefined ? [] : [one];
    });
    const second = (await askForBlockText(read.model, read.image, again, read.limits)).answer;
    for (const one of second.blocks) {
      const index = missing[one.number - 1];
      if (index !== undefined) {
        kept.push({ ...one, number: index + 1 });
      }
    }
  }
  return { text: { title: idText.title, blocks: kept }, again: missing.length };
}

// The fading blocks whose end the layout did not agree on, asked once more each; the end kept only where the second
// answer agrees with where the colour ends (`placedEnd`).
async function reaskedEnds(
  read: { model: Model; image: TimetableImage; limits: ReadingLimits },
  grid: GridFound,
  placed: readonly Placed[],
): Promise<{ placed: Placed[]; reasked: Record<number, string | null> }> {
  const asked = placed.flatMap((place, index) => {
    const block = grid.blocks[index];
    return block?.fades === true && placedEnd(block, place) === null ? [index] : [];
  });
  // Each asked at once and each observed; a failed one reads as no end, so the block is left out.
  const settled = await Promise.allSettled(
    asked.map(async (index) => {
      const place = placed[index];
      return place === undefined
        ? null
        : (await askForEnd(read.model, read.image, { day: place.day, start: place.start }, read.limits)).answer.end;
    }),
  );
  const ends = settled.map((one) => (one.status === 'fulfilled' ? one.value : null));
  return {
    placed: placed.map((place, index) => {
      const at = asked.indexOf(index);
      return at === -1 ? place : { ...place, modelEnd: ends[at] ?? null };
    }),
    reasked: Object.fromEntries(asked.map((index, at) => [index, ends[at] ?? null])),
  };
}

export interface GridReading {
  answer: ModelAnswer;
  listed: ListedBlock[];
  raw: unknown;
}

// The grid read, or null when its mapping does not hold (the caller then reads the whole picture).
export async function readGrid(
  model: Model,
  image: TimetableImage,
  grid: GridFound,
  limits: ReadingLimits,
  options: GridOptions = DEFAULT_GRID_OPTIONS,
): Promise<GridReading | null> {
  const read = { model, image, limits };
  // Both calls are observed from the start (P15-52 review): a rejection left unobserved would end the process. When
  // the layout fails, the text call is aborted, since nothing can be placed; when the text call fails, the text is read
  // after the layout instead.
  const abort = new AbortController();
  const signal = AbortSignal.any([abort.signal, ...(limits.signal === undefined ? [] : [limits.signal])]);
  const layoutCall = askForGridText(model, image, grid.blocks, { ...limits, signal, thinking: options.layoutThinking });
  const idCall = options.parallel ? askForIdText(model, image, grid.blocks, { ...limits, signal }) : null;
  const [layoutDone, idDone] = await Promise.allSettled([
    layoutCall.catch((error: unknown) => {
      abort.abort();
      throw error;
    }),
    idCall,
  ]);
  if (layoutDone.status === 'rejected') {
    throw layoutDone.reason;
  }
  const layout = layoutDone.value.answer;
  const idText = idDone.status === 'fulfilled' && idDone.value !== null ? idDone.value.answer : null;
  const first = placedBlocks(grid, layout);
  if (first === null) {
    return null;
  }
  const { placed, reasked } = options.fadeReask ? await reaskedEnds(read, grid, first) : { placed: first, reasked: {} };
  const listed = gridListed(grid, placed);
  const { text, again } =
    idText === null
      ? { text: (await askForBlockText(model, image, listed, limits)).answer, again: 0 }
      : await checkedIdText(read, idText, layout.axis, placed, listed);
  return { answer: placedAnswer(grid, placed, text), listed, raw: { layout, text, idText, reasked, again } };
}
