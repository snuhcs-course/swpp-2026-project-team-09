/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { NativeOcrResult, OcrLine } from '@/features/timetable-ocr/native-ocr';
import { type PixelImage, pixelImage } from '@/features/timetable-ocr/pixels';

// A drawn timetable for the pipeline's unit tests: a white picture 330 × 717 at scale 1 with grey grid lines, the
// day header, hour labels left of the first column and coloured blocks with their text.

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

export class Canvas {
  readonly rgba = new Uint8Array(WIDTH * HEIGHT * 4).fill(255);

  set(x: number, y: number, [red, green, blue]: Colour): void {
    if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT) {
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
    return pixelImage(WIDTH, HEIGHT, this.rgba);
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

const GREY: Colour = [225, 225, 225];

// The grid: a vertical line at each column edge and a horizontal one at each hour from 9 to 21.
export function gridCanvas(columns = 5): Canvas {
  const canvas = new Canvas();
  for (let index = 0; index <= columns; index += 1) {
    canvas.fill(LEFT + index * COLUMN, 90, LEFT + index * COLUMN + 1, rowOf(21), GREY);
  }
  for (let hour = 9; hour <= 21; hour += 1) {
    canvas.fill(0, rowOf(hour), WIDTH, rowOf(hour) + 1, GREY);
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
}

// Draws the blocks and returns the result as the native module would, with the header and labels as given.
export function screenshot(
  blocks: readonly DrawnBlock[],
  extra: OcrLine[] = headerLines().concat(labelLines()),
  canvas = gridCanvas(),
): NativeOcrResult {
  const lines = [...extra];
  for (const block of blocks) {
    const x0 = LEFT + block.day * COLUMN + 1;
    canvas.fill(x0, rowOf(block.start), x0 + COLUMN - 1, rowOf(block.end), block.colour);
    block.text.forEach((text, index) => {
      const confidence = block.confidence === undefined ? 0.9 : block.confidence;
      lines.push(line(text, x0 + 3, rowOf(block.start) + 3 + index * 12, confidence, Math.min(50, text.length * 8)));
    });
  }
  return {
    width: WIDTH,
    height: HEIGHT,
    lines,
    pixels: { width: WIDTH, height: HEIGHT, scale: 1, rgba: canvas.base64() },
  };
}
