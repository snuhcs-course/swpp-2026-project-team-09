/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { OcrPixels } from './native-ocr';

// The native module's small copy of the screenshot, decoded once: its saturation and value per pixel, the two numbers
// that the pixel steps read. A pixel (x, y) is at `x + y × width`.
export interface PixelImage {
  width: number;
  height: number;
  rgba: Uint8Array;
  // HSV saturation, 0–1.
  saturation: Float32Array;
  // HSV value, 0–255.
  value: Uint8Array;
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const DECODE = new Int16Array(128).fill(-1);
for (let index = 0; index < BASE64.length; index += 1) {
  DECODE[BASE64.codePointAt(index) ?? 0] = index;
}

// Base64 to bytes without a string of the whole image in between, which Hermes would copy.
export function decodeBase64(text: string): Uint8Array {
  let length = text.length;
  while (length > 0 && text[length - 1] === '=') {
    length -= 1;
  }
  const bytes = new Uint8Array(Math.floor((length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let out = 0;
  for (let index = 0; index < length; index += 1) {
    const sextet = DECODE[text.codePointAt(index) ?? 0] ?? -1;
    if (sextet >= 0) {
      buffer = ((buffer << 6) | sextet) & 0xffffff;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes[out] = (buffer >> bits) & 0xff;
        out += 1;
      }
    }
  }
  return out === bytes.length ? bytes : bytes.slice(0, out);
}

export function pixelImage(width: number, height: number, rgba: Uint8Array): PixelImage {
  const count = width * height;
  const saturation = new Float32Array(count);
  const value = new Uint8Array(count);
  // Plain comparisons rather than Math.max and Math.min, which made this loop over every pixel 60 times slower in Jest.
  for (let index = 0; index < count; index += 1) {
    const red = rgba[index * 4] ?? 0;
    const green = rgba[index * 4 + 1] ?? 0;
    const blue = rgba[index * 4 + 2] ?? 0;
    const most = red > green ? (red > blue ? red : blue) : green > blue ? green : blue;
    const least = red < green ? (red < blue ? red : blue) : green < blue ? green : blue;
    value[index] = most;
    saturation[index] = most === 0 ? 0 : (most - least) / most;
  }
  return { width, height, rgba, saturation, value };
}

export function decodePixels(pixels: OcrPixels): PixelImage {
  return pixelImage(pixels.width, pixels.height, decodeBase64(pixels.rgba));
}

// The mean colour of the pixels of a row between x0 and x1 (exclusive) that pass `keep`, or null when none does.
export function rowColour(
  image: PixelImage,
  y: number,
  x0: number,
  x1: number,
  keep: (index: number) => boolean,
): [number, number, number] | null {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let x = x0; x < x1; x += 1) {
    const index = y * image.width + x;
    if (keep(index)) {
      red += image.rgba[index * 4] ?? 0;
      green += image.rgba[index * 4 + 1] ?? 0;
      blue += image.rgba[index * 4 + 2] ?? 0;
      count += 1;
    }
  }
  return count === 0 ? null : [red / count, green / count, blue / count];
}

export function colourDistance(one: readonly number[], other: readonly number[]): number {
  return Math.hypot((one[0] ?? 0) - (other[0] ?? 0), (one[1] ?? 0) - (other[1] ?? 0), (one[2] ?? 0) - (other[2] ?? 0));
}
