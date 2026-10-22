/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { NativeOcrResult, OcrLine } from '@/features/timetable-ocr/native-ocr';
import { type PixelImage, pixelImage } from '@/features/timetable-ocr/pixels';
import type { Reading } from '@/features/timetable-ocr/read-timetable';

// A drawn timetable for the pipeline's unit tests: a picture 330 wide (717 high unless asked) with grid lines, the day
// header, hour labels left of the first column and coloured blocks with their text. White with grey lines by default;
// a theme draws it dark. The OCR boxes are at scale 1 unless a scale is asked, as a bigger screenshot's would be.

export const WIDTH = 330;
export const HEIGHT = 717;
// Five columns 60 wide from x = 30; 9:00 at y = 120 and 40 pixels an hour.
export const LEFT = 30;
export const COLUMN = 60;
export const TOP = 120;
export const HOUR = 40;

export function rowOf(hours: number): number {
  return TOP + (hours - 9) * HOUR;
}

export type Colour = [number, number, number];

export interface Theme {
  background: Colour;
  grid: Colour;
  // The colour of the text drawn inside blocks and outside them, as thin strokes; none drawn when absent.
  blockText?: Colour;
  otherText?: Colour;
}

export const LIGHT: Theme = { background: [255, 255, 255], grid: [225, 225, 225] };
// iOS's dark mode: system background #1c1c1e, separators #2c2c2e, white text on blocks, grey labels.
export const DARK: Theme = {
  background: [28, 28, 30],
  grid: [44, 44, 46],
  blockText: [255, 255, 255],
  otherText: [142, 142, 147],
};

export class Canvas {
  readonly rgba: Uint8Array;

  constructor(
    readonly height = HEIGHT,
    background: Colour = LIGHT.background,
  ) {
    this.rgba = new Uint8Array(WIDTH * height * 4).fill(255);
    this.fill(0, 0, WIDTH, height, background);
  }

  set(x: number, y: number, [red, green, blue]: Colour): void {
    if (x >= 0 && y >= 0 && x < WIDTH && y < this.height) {
      const index = (y * WIDTH + x) * 4;
      this.rgba[index] = red;
      this.rgba[index + 1] = green;
      this.rgba[index + 2] = blue;
    }
  }

  fill(x0: number, y0: number, x1: number, y1: number, colour: Colour): void {
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        this.set(x, y, colour);
      }
    }
  }

  image(): PixelImage {
    return pixelImage(WIDTH, this.height, this.rgba);
  }

  base64(): string {
    return encodeBase64(this.rgba);
  }
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeBase64(bytes: Uint8Array): string {
  const out: string[] = [];
  for (let index = 0; index < bytes.length; index += 3) {
    const triple = ((bytes[index] ?? 0) << 16) | ((bytes[index + 1] ?? 0) << 8) | (bytes[index + 2] ?? 0);
    const left = bytes.length - index;
    out.push(
      ALPHABET[(triple >> 18) & 63] ?? '',
      ALPHABET[(triple >> 12) & 63] ?? '',
      left > 1 ? (ALPHABET[(triple >> 6) & 63] ?? '') : '=',
      left > 2 ? (ALPHABET[triple & 63] ?? '') : '=',
    );
  }
  return out.join('');
}

// The grid: a vertical line at each column edge and a horizontal one at each hour from 9 to `last`.
export function gridCanvas(columns = 5, theme = LIGHT, height = HEIGHT, last = 21): Canvas {
  const canvas = new Canvas(height, theme.background);
  for (let index = 0; index <= columns; index += 1) {
    canvas.fill(LEFT + index * COLUMN, 90, LEFT + index * COLUMN + 1, rowOf(last), theme.grid);
  }
  for (let hour = 9; hour <= last; hour += 1) {
    canvas.fill(0, rowOf(hour), WIDTH, rowOf(hour) + 1, theme.grid);
  }
  return canvas;
}

export function line(
  text: string,
  x: number,
  y: number,
  confidence: number | null = 0.9,
  w = text.length * 8,
): OcrLine {
  const box = { x, y, w, h: 10 };
  return { text, box, confidence, elements: [{ text, box, confidence }] };
}

// One word per day letter, centred on its column, read with ML Kit's low confidence for a lone letter.
export function headerLines(days = ['월', '화', '수', '목', '금']): OcrLine[] {
  const week = ['월', '화', '수', '목', '금', '토', '일'];
  return days.map((day) => line(day, LEFT + week.indexOf(day) * COLUMN + COLUMN / 2 - 4, 95, 0.3, 8));
}

// Labels in the strip left of the first column, a little below their hour's line; 12-hour from 1 p.m. if asked.
export function labelLines(from = 9, to = 20, twelveHour = false): OcrLine[] {
  const lines: OcrLine[] = [];
  for (let hour = from; hour <= to; hour += 1) {
    const shown = twelveHour && hour > 12 ? hour - 12 : hour;
    lines.push(line(String(shown), 4, rowOf(hour) + 4, 0.85, 16));
  }
  return lines;
}

export interface DrawnBlock {
  day: number;
  start: number;
  end: number;
  colour: Colour;
  text: string[];
  confidence?: number | null;
  // The colour its last 15 rows fade to, as a block behind a blurred tab bar or running off the picture does.
  fadeTo?: Colour;
}

export interface Drawing {
  // The OCR boxes are this many times the picture's pixels.
  scale?: number;
  // Draws each text line as thin strokes in these colours.
  theme?: Theme;
}

// Thin vertical strokes over a text line's box, 1 pixel wide every 3, as letters look in the small copy.
function strokes(canvas: Canvas, box: { x: number; y: number; w: number; h: number }, colour: Colour): void {
  for (let x = Math.round(box.x); x < box.x + box.w; x += 3) {
    canvas.fill(x, Math.round(box.y) + 1, x + 1, Math.round(box.y + box.h) - 1, colour);
  }
}

function scaled(one: OcrLine, scale: number): OcrLine {
  const box = (b: OcrLine['box']): OcrLine['box'] => ({
    x: b.x * scale,
    y: b.y * scale,
    w: b.w * scale,
    h: b.h * scale,
  });
  return {
    ...one,
    box: box(one.box),
    elements: one.elements.map((element) => ({ ...element, box: box(element.box) })),
  };
}

// Draws the blocks and returns the result as the native module would, with the header and labels as given.
export function screenshot(
  blocks: readonly DrawnBlock[],
  extra: OcrLine[] = headerLines().concat(labelLines()),
  canvas = gridCanvas(),
  { scale = 1, theme }: Drawing = {},
): NativeOcrResult {
  const lines = [...extra];
  if (theme?.otherText !== undefined) {
    for (const one of extra) {
      strokes(canvas, one.box, theme.otherText);
    }
  }
  for (const block of blocks) {
    const x0 = LEFT + block.day * COLUMN + 1;
    const [y0, y1] = [rowOf(block.start), Math.min(canvas.height, rowOf(block.end))];
    canvas.fill(x0, y0, x0 + COLUMN - 1, y1, block.colour);
    const { fadeTo } = block;
    if (fadeTo !== undefined) {
      for (let step = 1; step <= 15; step += 1) {
        const mix = step / 16;
        const blend = (index: 0 | 1 | 2): number => Math.round(block.colour[index] * (1 - mix) + fadeTo[index] * mix);
        const colour: Colour = [blend(0), blend(1), blend(2)];
        canvas.fill(x0, y1 - 16 + step, x0 + COLUMN - 1, y1 - 15 + step, colour);
      }
    }
    block.text.forEach((text, index) => {
      const confidence = block.confidence === undefined ? 0.9 : block.confidence;
      const drawn = line(text, x0 + 3, y0 + 3 + index * 12, confidence, Math.min(50, text.length * 8));
      if (theme?.blockText !== undefined) {
        strokes(canvas, drawn.box, theme.blockText);
      }
      lines.push(drawn);
    });
  }
  return {
    width: WIDTH * scale,
    height: canvas.height * scale,
    lines: lines.map((one) => scaled(one, scale)),
    pixels: { width: WIDTH, height: canvas.height, scale, rgba: canvas.base64() },
  };
}

// iOS's system colours, as timetable apps paint blocks in dark mode.
export const GREEN: Colour = [48, 209, 88];
export const PURPLE: Colour = [191, 90, 242];
export const INDIGO: Colour = [94, 92, 230];
export const ORANGE: Colour = [255, 159, 10];
export const BLUE: Colour = [10, 132, 255];
export const CYAN: Colour = [100, 210, 255];
export const LIME: Colour = [170, 220, 60];

// One line per time read, "고급컴퓨터구조 monday 09:30-10:45 301 203": the name without spaces (a Korean wrap loses
// its space, a limit reported in accuracy.md), the day, the times, the building and the room.
export function summary(reading: Reading): string[] {
  if (reading.kind !== 'read') {
    return [reading.reason];
  }
  return reading.classes.flatMap((lesson) =>
    lesson.times.map(
      (one) =>
        `${lesson.name.replaceAll(/\s+/gu, '')} ${one.weekday} ${one.start}-${one.end} ${one.placeId?.replace('place-', '') ?? '-'} ${one.room ?? '-'}`,
    ),
  );
}
