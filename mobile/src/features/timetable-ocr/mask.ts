/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { BLOCK, type PixelImage } from './pixels';

// ② The mask of the coloured blocks' pixels, closed, and its connected components.

// A block's pixel: more coloured than the background (`pixels.ts`). The background, the grid lines and text fall out,
// on a light or a dark picture alike.
export function blockMask(image: PixelImage): Uint8Array {
  const mask = new Uint8Array(image.width * image.height);
  for (let index = 0; index < mask.length; index += 1) {
    if (image.kind[index] === BLOCK) {
      mask[index] = 1;
    }
  }
  return mask;
}

// A square max (dilate, `keep` 1) or min (erode, `keep` 0) filter of the given radius, one direction at a time, with
// a running count of the window's `keep` pixels. Outside the picture counts as `keep` when eroding, so that the edges
// do not erode.
function filter(mask: Uint8Array, width: number, height: number, radius: number, keep: 0 | 1): Uint8Array {
  const pass = (from: Uint8Array, horizontal: boolean): Uint8Array => {
    const to = new Uint8Array(from.length);
    const outside = keep === 0 ? 1 : 0;
    const [length, lines, stride] = horizontal ? [width, height, 1] : [height, width, width];
    for (let line = 0; line < lines; line += 1) {
      const base = horizontal ? line * width : line;
      let count = outside * radius;
      for (let step = 0; step < radius && step < length; step += 1) {
        count += from[base + step * stride] === keep ? 1 : 0;
      }
      for (let step = 0; step < length; step += 1) {
        const entering = step + radius;
        count += entering < length ? (from[base + entering * stride] === keep ? 1 : 0) : outside;
        to[base + step * stride] = count > 0 ? keep : 1 - keep;
        const leaving = step - radius;
        count -= leaving >= 0 ? (from[base + leaving * stride] === keep ? 1 : 0) : outside;
      }
    }
    return to;
  };
  return pass(pass(mask, true), false);
}

// A morphological close: the white letters inside a block are filled.
export function closeMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  return filter(filter(mask, width, height, radius, 1), width, height, radius, 0);
}

// Labels the component that holds `start`, by a flood over its 4-neighbours.
function flood(mask: Uint8Array, labels: Int32Array, width: number, start: number, label: number): void {
  const stack = [start];
  labels[start] = label;
  const last = mask.length - width;
  while (stack.length > 0) {
    const index = stack.pop() ?? 0;
    const x = index % width;
    const neighbours = [
      x > 0 ? index - 1 : -1,
      x < width - 1 ? index + 1 : -1,
      index >= width ? index - width : -1,
      index < last ? index + width : -1,
    ];
    for (const next of neighbours) {
      if (next >= 0 && mask[next] === 1 && labels[next] === 0) {
        labels[next] = label;
        stack.push(next);
      }
    }
  }
}

// Connected components (4-neighbours): a label per pixel, 0 for none, and the count.
export function components(mask: Uint8Array, width: number): { labels: Int32Array; count: number } {
  const labels = new Int32Array(mask.length);
  let count = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 1 && labels[start] === 0) {
      count += 1;
      flood(mask, labels, width, start, count);
    }
  }
  return { labels, count };
}
