/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { generateText, Output } from 'ai';
import { z } from 'zod';
import { type Model } from '../assistant/adapter.js';

// P15-52: the model's half of reading a timetable screenshot. It reads what is printed, as printed, and nothing else;
// the code's half (reading-checks.ts) turns that into classes and leaves out what fails a check. Nothing here names an
// app: the instructions describe any weekly timetable grid.
//
// Two ways, by what the phone sends:
// - blocks: the phone found the class blocks and their times from the picture's pixels and the day and hour labels'
//   positions (`mobile/src/features/timetable-ocr`), and the model reads only each numbered block's text;
// - the whole picture: the model also reads the hour axis and each block's day, start and end.

const GRID = `A weekly timetable is a grid: a row of day labels across the top (월 화 수 목 금, sometimes 토 일; or Mon Tue …), hour labels down one side (on a 24-hour clock such as 9 … 18, or a 12-hour clock such as 9 … 12, 1 … 6, sometimes written 09, 9:00, 오전 9시 or 9 AM), and coloured blocks, one per class meeting, each in its day's column from its start to its end. Inside a block the course name comes first, sometimes wrapped over two or three lines (a line may break between words or inside a word); there may be a room (a building number and a room, such as 301-118, 302-311-1, 500-L309, 26-B102 or 43-1-403) and other lines, such as a professor's name or a class code. Anything outside the grid (titles, buttons, credit counts, cards or lists below, tab bars, system overlays) is not a class.`;

const TEXT_RULES = `- nameLines: the course name's lines inside the block, each exactly as printed, character by character, top to bottom. Not the room line, and not other lines such as a professor's name or a class code.
- name: the name as it reads once its lines are joined: no space where a line broke inside a word (컴퓨터프로그래 + 밍 = 컴퓨터프로그래밍, 대학영어 2: 말 + 하기 = 대학영어 2: 말하기), one space where it broke between words (컴퓨터의 개념 + 및 실습 = 컴퓨터의 개념 및 실습).
- room: the room exactly as printed, or null when the block has none.
- Copy what is printed; never correct, complete or translate it. A name cut short with … keeps the ….`;

export const WHOLE_INSTRUCTIONS = `You read a screenshot of a weekly university timetable and report what is printed on it. Report only what you can see; never add a class that is not drawn.

${GRID}

What to report:
- axis: every hour label, top to bottom, exactly as printed.
- blocks: one entry per coloured block, in reading order. For each:
  - day: its column's day label as printed.
  - start and end: where its top and bottom edges fall against the hour lines, as "H:MM" on the axis's own clock, to five minutes (a block whose top is a quarter of the way into the hour labelled 2 starts at "2:15"). Follow each edge across to the axis and count the hour lines between it and the nearest label; do not guess from the block's height alone.
${TEXT_RULES.replaceAll(/^- /gmu, '  - ')}
  - cut: true only when the block's top or bottom edge cannot be seen: it runs under a bar or off the picture, or fades out into the background. A block whose edge is drawn sharp is not cut, even when it ends on the grid's last line or its bottom edge.
- title: the timetable's own name as printed above the grid, without a credit count or the app's own words; null when none can be read.

If the picture is not a timetable, give an empty axis and no blocks.`;

export const BLOCK_INSTRUCTIONS = `You read the text inside class blocks on a screenshot of a weekly university timetable. The blocks have been found already: each is listed with its number, its day and its time on a 24-hour clock (the picture's hour labels may use a 12-hour clock: 13:00 is the line labelled 1). For each listed block, read what is printed inside it. A block listed with an end and "?" (such as 19:00–20:50?) fades out at its bottom or runs under a bar, and its colour is last seen at that time: also read where it ends.

${GRID}

What to report, for every listed number:
${TEXT_RULES}
- end: only for a block listed with "?": where its bottom edge falls against the hour lines, as "HH:MM" on a 24-hour clock, to five minutes; the listed time when the block ends where its colour is last seen, a later one only when the picture shows it runs on; null when it cannot be told. For every other block, null.
- If no class block is at a listed place, give empty nameLines and an empty name.
And title: the timetable's own name as printed above the grid, without a credit count or the app's own words; null when none can be read.`;

export const GRID_INSTRUCTIONS = `You read the layout of a screenshot of a weekly university timetable: its hour labels, and where each class block is. The class blocks have been found already, by their colour: each is listed with its number as "column C, block K", the K-th block from the top in the C-th day column counted from the left (the hour labels' strip is not a column). Their text is read later; here report only where they are.

${GRID}

What to report:
- axis: every hour label, top to bottom, exactly as printed.
- blocks: for every listed number:
  - day: the day label at the top of its column as printed, or null when it is hidden.
  - start and end: where its top and bottom edges fall against the hour lines, as "H:MM" on the axis's own clock, to five minutes. For a block whose bottom fades out or runs under a bar, the end where the class ends.
- title: the timetable's own name as printed above the grid, without a credit count or the app's own words; null when none can be read.`;

// Loose for the provider, since providers differ in the constraints they take; reading-checks.ts checks every field.
export const answerSchema = z.object({
  title: z.string().nullable(),
  axis: z.array(z.string()),
  blocks: z.array(
    z.object({
      day: z.string(),
      start: z.string(),
      end: z.string(),
      nameLines: z.array(z.string()),
      name: z.string(),
      room: z.string().nullable(),
      cut: z.boolean(),
    }),
  ),
});

export type ModelAnswer = z.infer<typeof answerSchema>;

export const textSchema = z.object({
  title: z.string().nullable(),
  blocks: z.array(
    z.object({
      number: z.number(),
      nameLines: z.array(z.string()),
      name: z.string(),
      room: z.string().nullable(),
      end: z.string().nullable().optional(),
    }),
  ),
});

export type TextAnswer = z.infer<typeof textSchema>;

export const gridTextSchema = z.object({
  title: z.string().nullable(),
  axis: z.array(z.string()),
  blocks: z.array(z.object({ number: z.number(), day: z.string().nullable(), start: z.string(), end: z.string() })),
});

export type GridTextAnswer = z.infer<typeof gridTextSchema>;

export interface ReadingLimits {
  timeoutMs: number;
  maxOutputTokens: number;
  // Whether the model may think first (adaptive thinking, the default). Off makes a short call quicker.
  thinking?: boolean;
  // Ends the call early, as when the other call of a reading failed, or the reading's deadline has passed.
  signal?: AbortSignal;
  // The model calls the reading may still make; every call takes one.
  budget?: CallBudget;
}

// The model calls one reading may make, over all its steps (P15-52 review): the layout and the text, at most
// MOST_END_REASKS fading ends, one re-read of blocks whose start did not agree, and one second look at near-miss
// names. A call past the last throws before anything is sent, so that no answer, however made, starts more.
export const MOST_MODEL_CALLS = 7;

export class CallsSpentError extends Error {
  constructor() {
    super(`A reading may make at most ${MOST_MODEL_CALLS} model calls`);
    this.name = 'CallsSpentError';
  }
}

export interface CallBudget {
  // One call taken, or CallsSpentError when none is left.
  take: () => void;
}

export function callBudget(most: number = MOST_MODEL_CALLS): CallBudget {
  let made = 0;
  return {
    take: () => {
      if (made >= most) {
        throw new CallsSpentError();
      }
      made += 1;
    },
  };
}

export interface TimetableImage {
  data: Uint8Array;
  mediaType: string;
}

// A block as listed to the model: its number is its place in the list, from 1.
export interface ListedBlock {
  // The day's letter, 월 … 일.
  day: string;
  // "13:00".
  start: string;
  end: string;
  // Its end is not seen: `end` is where its colour ends, and the model is asked for the true end.
  fades?: boolean;
}

export interface ModelCall<Answer> {
  answer: Answer;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
}

async function ask<Answer>(
  model: Model,
  instructions: string,
  image: TimetableImage,
  text: string,
  schema: z.ZodType<Answer>,
  { timeoutMs, maxOutputTokens, thinking = true, signal, budget }: ReadingLimits,
): Promise<ModelCall<Answer>> {
  // Past the reading's deadline, or over its calls, nothing is sent.
  signal?.throwIfAborted();
  budget?.take();
  const { output, usage } = await generateText({
    model,
    instructions,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'file', data: image.data, mediaType: image.mediaType },
          { type: 'text', text },
        ],
      },
    ],
    output: Output.object({ schema }),
    maxRetries: 0,
    maxOutputTokens,
    timeout: { totalMs: timeoutMs },
    ...(signal === undefined ? {} : { abortSignal: signal }),
    providerOptions: {
      openrouter: { provider: { require_parameters: true, data_collection: 'deny' } },
      ...(thinking ? {} : { anthropic: { thinking: { type: 'disabled' } } }),
    },
  });
  return { answer: output, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
}

// The whole picture read: axis, blocks and their text. Throws what the SDK throws when the model fails, the time
// runs out or the answer is not of the schema's shape.
export function askForTimetable(
  model: Model,
  image: TimetableImage,
  limits: ReadingLimits,
): Promise<ModelCall<ModelAnswer>> {
  return ask(model, WHOLE_INSTRUCTIONS, image, 'Read this timetable.', answerSchema, limits);
}

export function blockList(blocks: readonly ListedBlock[]): string {
  return blocks
    .map(({ day, start, end, fades }, index) => `${index + 1}. ${day} ${start}–${end}${fades === true ? '?' : ''}`)
    .join('\n');
}

// The text of the listed blocks. Throws as askForTimetable does.
export function askForBlockText(
  model: Model,
  image: TimetableImage,
  blocks: readonly ListedBlock[],
  limits: ReadingLimits,
): Promise<ModelCall<TextAnswer>> {
  return ask(model, BLOCK_INSTRUCTIONS, image, `The blocks:\n${blockList(blocks)}`, textSchema, limits);
}

// Found blocks as listed to the model: each one's day column, counted from 1 at the left, and its place among all the
// column's blocks (`all`), counted from the top.
export function gridList(
  blocks: readonly { column: number; top: number }[],
  all: readonly { column: number; top: number }[] = blocks,
): string {
  return blocks
    .map(({ column, top }, index) => {
      const above = all.filter((other) => other.column === column && other.top < top).length;
      return `${index + 1}. column ${column + 1}, block ${above + 1}`;
    })
    .join('\n');
}

// The labels and each listed block's day and rough times. Throws as askForTimetable does.
export function askForGridText(
  model: Model,
  image: TimetableImage,
  blocks: readonly { column: number; top: number }[],
  limits: ReadingLimits,
  all: readonly { column: number; top: number }[] = blocks,
): Promise<ModelCall<GridTextAnswer>> {
  return ask(model, GRID_INSTRUCTIONS, image, `The blocks:\n${gridList(blocks, all)}`, gridTextSchema, limits);
}

export const END_INSTRUCTIONS = `You read one class block on a screenshot of a weekly university timetable. Its bottom fades out or runs under a bar. Say where the class ends: the time, on a 24-hour clock as "HH:MM" to five minutes, at which its bottom edge falls against the hour lines (the picture's hour labels may use a 12-hour clock: 13:00 is the line labelled 1). If its end cannot be seen or told, give null. Do not guess from a usual class length.

${GRID}`;

export const endSchema = z.object({ end: z.string().nullable() });

// Where one fading block ends, asked on its own: the block given by its day and start. Throws as askForTimetable does.
export function askForEnd(
  model: Model,
  image: TimetableImage,
  block: { day: string; start: string },
  limits: ReadingLimits,
): Promise<ModelCall<z.infer<typeof endSchema>>> {
  return ask(model, END_INSTRUCTIONS, image, `The block: ${block.day} from ${block.start}`, endSchema, limits);
}

export const ID_TEXT_INSTRUCTIONS = `You read the text inside class blocks on a screenshot of a weekly university timetable. The blocks have been found already, by their colour: each is listed with its number as "column C, block K", the K-th block from the top in the C-th day column counted from the left (the hour labels' strip is not a column). For each listed block, read what is printed inside it, and where it starts.

${GRID}

What to report, for every listed number, each one once:
- start: where its top edge falls against the hour lines, as "H:MM" on the axis's own clock, to five minutes.
${TEXT_RULES}
- If no class block is at a listed place, give empty nameLines and an empty name.
And title: the timetable's own name as printed above the grid, without a credit count or the app's own words; null when none can be read.`;

export const idTextSchema = z.object({
  title: z.string().nullable(),
  blocks: z.array(
    z.object({
      number: z.number(),
      start: z.string(),
      nameLines: z.array(z.string()),
      name: z.string(),
      room: z.string().nullable(),
    }),
  ),
});

export type IdTextAnswer = z.infer<typeof idTextSchema>;

// The text of the found blocks named by column and place, with each one's start for a check, read at the same time as
// the layout. Throws as askForTimetable does.
export function askForIdText(
  model: Model,
  image: TimetableImage,
  blocks: readonly { column: number; top: number }[],
  limits: ReadingLimits,
): Promise<ModelCall<IdTextAnswer>> {
  return ask(model, ID_TEXT_INSTRUCTIONS, image, `The blocks:\n${gridList(blocks)}`, idTextSchema, limits);
}
