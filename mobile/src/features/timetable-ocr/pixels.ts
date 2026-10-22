/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { OcrPixels } from './native-ocr';

// The native module's small copy of the screenshot, decoded once, with what each pixel is. Nothing assumes a white or
// a dark picture: the background is measured (the most common colour), and every pixel is judged against it, so a
// light and a dark theme are read alike. A pixel (x, y) is at `x + y × width`.

export type Colour = [number, number, number];

// What a pixel is, judged against the background. PLAIN: the background, or as near as noise. FAINT: grey and a
// little off the background, a grid line or a grey band. BLOCK: coloured, part of a class's block. INK: grey and far
// from the background, text or icons.
export const PLAIN = 0;
export const FAINT = 1;
export const BLOCK = 2;
export const INK = 3;

export interface PixelImage {
  width: number;
  height: number;
  rgba: Uint8Array;
  // max − min of RGB, 0–255: how coloured a pixel is. Grey (white, black, any grey) is 0.
  chroma: Uint8Array;
  // PLAIN, FAINT, BLOCK or INK per pixel.
  kind: Uint8Array;
  background: Colour;
  backgroundChroma: number;
}

// How much more coloured than the background a block's pixel is: a tenth of the RGB range. The UI around a
// timetable's blocks (background, grid, text, bars) is grey in every theme, and grey stays under this even blended or
// compressed; the colours apps give blocks, pastels included, are above it.
export const BLOCK_CHROMA = 24;
// A grey pixel this close to the background (RGB distance) is the background: rounding and blending.
const NOISE = 5;
// A grey pixel up to this far from the background is faint, as a grid line is; text is drawn further from it. A third
// of the RGB cube's diagonal: lines are drawn low in contrast so as not to compete with text, in either theme.
export const FAINT_DISTANCE = 147;

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

// The background: the most common colour, counted in bins of 8 levels per channel, as the mean of its bin's pixels.
function backgroundOf(rgba: Uint8Array, count: number): Colour {
  const bins = new Uint32Array(32 * 32 * 32);
  let best = 0;
  for (let index = 0; index < count; index += 1) {
    const bin =
      ((rgba[index * 4] ?? 0) >> 3) * 1024 + ((rgba[index * 4 + 1] ?? 0) >> 3) * 32 + ((rgba[index * 4 + 2] ?? 0) >> 3);
    bins[bin] = (bins[bin] ?? 0) + 1;
    if ((bins[bin] ?? 0) > (bins[best] ?? 0)) {
      best = bin;
    }
  }
  const sum: Colour = [0, 0, 0];
  for (let index = 0; index < count; index += 1) {
    const bin =
      ((rgba[index * 4] ?? 0) >> 3) * 1024 + ((rgba[index * 4 + 1] ?? 0) >> 3) * 32 + ((rgba[index * 4 + 2] ?? 0) >> 3);
    if (bin === best) {
      sum[0] += rgba[index * 4] ?? 0;
      sum[1] += rgba[index * 4 + 1] ?? 0;
      sum[2] += rgba[index * 4 + 2] ?? 0;
    }
  }
  const total = Math.max(1, bins[best] ?? 0);
  return [sum[0] / total, sum[1] / total, sum[2] / total];
}

export function chromaOf([red, green, blue]: readonly number[]): number {
  return Math.max(red ?? 0, green ?? 0, blue ?? 0) - Math.min(red ?? 0, green ?? 0, blue ?? 0);
}

export function pixelImage(width: number, height: number, rgba: Uint8Array): PixelImage {
  const count = width * height;
  const background = backgroundOf(rgba, count);
  const backgroundChroma = chromaOf(background);
  const chroma = new Uint8Array(count);
  const kind = new Uint8Array(count);
  // Plain comparisons rather than Math.max and Math.min, which made this loop over every pixel 60 times slower in Jest.
  for (let index = 0; index < count; index += 1) {
    const red = rgba[index * 4] ?? 0;
    const green = rgba[index * 4 + 1] ?? 0;
    const blue = rgba[index * 4 + 2] ?? 0;
    const most = red > green ? (red > blue ? red : blue) : green > blue ? green : blue;
    const least = red < green ? (red < blue ? red : blue) : green < blue ? green : blue;
    chroma[index] = most - least;
    if (most - least >= backgroundChroma + BLOCK_CHROMA) {
      kind[index] = BLOCK;
    } else {
      const [dr, dg, db] = [red - background[0], green - background[1], blue - background[2]];
      const squared = dr * dr + dg * dg + db * db;
      kind[index] = squared < NOISE * NOISE ? PLAIN : squared <= FAINT_DISTANCE * FAINT_DISTANCE ? FAINT : INK;
    }
  }
  return { width, height, rgba, chroma, kind, background, backgroundChroma };
}

// Whether a colour (a row's mean, say) is plain: grey and no further from the background than a grid line is.
export function isPlain(image: PixelImage, colour: readonly number[]): boolean {
  return (
    chromaOf(colour) < image.backgroundChroma + BLOCK_CHROMA &&
    colourDistance(colour, image.background) <= FAINT_DISTANCE
  );
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
