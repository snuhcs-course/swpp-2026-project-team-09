/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Column } from './grid';
import { blockMask, closeMask, components } from './mask';
import { BLOCK, type Colour, colourDistance, INK, isPlain, type PixelImage, rowColour } from './pixels';

// ② The coloured blocks, in the small copy's pixels: x1 and y1 are exclusive.

export interface Block {
  column: Column;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  // Its colour, the median of its rows.
  colour: [number, number, number];
}

interface Part {
  label: number;
  column: Column;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

// How many pixels of each component each row of a column holds: `covered[label × height + y]`.
function coverage(
  labels: Int32Array,
  count: number,
  width: number,
  height: number,
  x0: number,
  x1: number,
): Int32Array {
  const covered = new Int32Array((count + 1) * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const label = labels[y * width + x] ?? 0;
      covered[label * height + y] = (covered[label * height + y] ?? 0) + 1;
    }
  }
  return covered;
}

// The runs of rows in which `full` holds, as [start, end) pairs.
function runs(length: number, full: (index: number) => boolean): [number, number][] {
  const found: [number, number][] = [];
  let start = -1;
  for (let index = 0; index <= length; index += 1) {
    const inside = index < length && full(index);
    if (inside && start < 0) {
      start = index;
    } else if (!inside && start >= 0) {
      found.push([start, index]);
      start = -1;
    }
  }
  return found;
}

// Each component cut at the column edges: within one column, the runs of rows where the component covers at least
// half the width. Two same-coloured blocks side by side (근장 on 수 and 목) become two.
export function cutAtColumns(
  labels: Int32Array,
  count: number,
  width: number,
  height: number,
  columns: readonly Column[],
): Part[] {
  return columns.flatMap((column) => {
    const x0 = Math.max(0, Math.ceil(column.left));
    const x1 = Math.min(width, Math.floor(column.right));
    if (x1 <= x0) {
      return [];
    }
    const covered = coverage(labels, count, width, height, x0, x1);
    const parts: Part[] = [];
    for (let label = 1; label <= count; label += 1) {
      for (const [y0, y1] of runs(height, (y) => (covered[label * height + y] ?? 0) >= (x1 - x0) * 0.5)) {
        parts.push({ label, column, x0, x1, y0, y1 });
      }
    }
    return parts;
  });
}

// The colours of a part's rows: the mean of each row's block pixels, null for a row without any.
function rowColours(
  image: PixelImage,
  part: { x0: number; x1: number; y0: number; y1: number },
): ([number, number, number] | null)[] {
  const colours: ([number, number, number] | null)[] = [];
  for (let y = part.y0; y < part.y1; y += 1) {
    colours.push(rowColour(image, y, part.x0, part.x1, (index) => image.kind[index] === BLOCK));
  }
  return colours;
}

function medianColour(colours: readonly ([number, number, number] | null)[]): [number, number, number] {
  const present = colours.filter((colour) => colour !== null);
  const channel = (index: number): number => {
    const sorted = present.map((colour) => colour[index] ?? 0).toSorted((one, other) => one - other);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  return [channel(0), channel(1), channel(2)];
}

// Splits a part where its colour changes for good: two blocks of different colours touching in one column.
function splitByColour(image: PixelImage, part: Part): Part[] {
  const colours = rowColours(image, part);
  const cuts: number[] = [];
  for (let offset = 2; offset < colours.length - 1; offset += 1) {
    const before = colours[offset - 2];
    const last = colours[offset - 1];
    const here = colours[offset];
    const next = colours[offset + 1];
    if (
      before !== null &&
      before !== undefined &&
      last !== null &&
      last !== undefined &&
      here !== null &&
      here !== undefined &&
      next !== null &&
      next !== undefined &&
      colourDistance(before, last) < 12 &&
      colourDistance(here, next) < 12 &&
      colourDistance(last, here) >= 45
    ) {
      cuts.push(part.y0 + offset);
    }
  }
  const edges = [part.y0, ...cuts, part.y1];
  return edges.slice(1).map((y1, index) => ({
    label: part.label,
    column: part.column,
    x0: part.x0,
    x1: part.x1,
    y0: edges[index] ?? part.y0,
    y1,
  }));
}

// How far a pixel leans from a block's colour towards the background's, 0 at the block's colour and 1 at the
// background's: its offset from the block projected on the line between the two.
function towardsBackground(image: PixelImage, index: number, colour: readonly number[]): number {
  let along = 0;
  let length = 0;
  for (let channel = 0; channel < 3; channel += 1) {
    const toBackground = (image.background[channel] ?? 0) - (colour[channel] ?? 0);
    along += ((image.rgba[index * 4 + channel] ?? 0) - (colour[channel] ?? 0)) * toBackground;
    length += toBackground * toBackground;
  }
  return length === 0 ? 0 : along / length;
}

// Splits two same-coloured blocks stacked with no gap where a thin separator runs across them: one or two rows in
// which nearly every pixel leans from the block's colour towards the background's (lighter on a light picture, darker
// on a dark one), with the block's colour above and below. Letters cover only part of a row, so they are no separator.
export function splitAtSeparators(
  image: PixelImage,
  part: { x0: number; x1: number; y0: number; y1: number },
): number[] {
  const colours = rowColours(image, part);
  const colour = medianColour(colours);
  const separating = (y: number): boolean => {
    let count = 0;
    for (let x = part.x0; x < part.x1; x += 1) {
      if (towardsBackground(image, y * image.width + x, colour) >= 0.15) {
        count += 1;
      }
    }
    return count >= (part.x1 - part.x0) * 0.9;
  };
  const plain = (y: number): boolean => {
    const row = colours[y - part.y0];
    return row !== null && row !== undefined && colourDistance(row, colour) < 20;
  };
  const cuts: number[] = [];
  for (let y = part.y0 + 3; y < part.y1 - 3; y += 1) {
    const thickness = separating(y) ? (separating(y + 1) ? 2 : 1) : 0;
    if (thickness > 0 && !separating(y - 1) && !separating(y + thickness) && plain(y - 2) && plain(y + thickness + 1)) {
      cuts.push(y);
      y += thickness;
    }
  }
  return cuts;
}

// What makes a part a block: wide as its column, filled with colour, and at least a quarter of a cell.
function isBlock(mask: Uint8Array, width: number, part: Part, hourHeight: number, headerBottom: number): boolean {
  const columnWidth = part.column.right - part.column.left;
  const area = (part.x1 - part.x0) * (part.y1 - part.y0);
  let filled = 0;
  for (let y = part.y0; y < part.y1; y += 1) {
    for (let x = part.x0; x < part.x1; x += 1) {
      filled += mask[y * width + x] ?? 0;
    }
  }
  return (
    part.y0 >= headerBottom &&
    part.x1 - part.x0 >= columnWidth * 0.85 &&
    area >= columnWidth * hourHeight * 0.25 &&
    filled >= area * 0.6
  );
}

// The blocks of the picture: the coloured pixels, closed, as connected components cut at the column edges, split
// where their colour changes or a separator runs across, without what is above the header's bottom or too small.
// The label strip and the tab bar lie outside every column or hold nothing as wide as one.
export function findBlocks(
  image: PixelImage,
  columns: readonly Column[],
  hourHeight: number,
  headerBottom: number,
): Block[] {
  const { width, height } = image;
  const mask = blockMask(image);
  const closed = closeMask(mask, width, height, 2);
  const { labels, count } = components(closed, width);
  const blocks: Block[] = [];
  for (const part of cutAtColumns(labels, count, width, height, columns)) {
    for (const piece of splitByColour(image, part)) {
      const cuts = splitAtSeparators(image, piece);
      const edges = [piece.y0, ...cuts, piece.y1];
      edges.slice(1).forEach((y1, index) => {
        const y0 = (edges[index] ?? piece.y0) + (index > 0 ? 1 : 0);
        const block = { ...piece, y0, y1 };
        if (isBlock(mask, width, block, hourHeight, headerBottom)) {
          blocks.push({
            column: block.column,
            x0: block.x0,
            x1: block.x1,
            y0,
            y1,
            colour: medianColour(rowColours(image, block)),
          });
        }
      });
    }
  }
  return blocks;
}

// Whether another block of the same column meets `block` at row `y` (its top there when `y` is the block's bottom, and
// the other way round): two classes back to back, whose shared edge is real.
function meetsAnother(block: Block, blocks: readonly Block[], y: number, side: 'above' | 'below'): boolean {
  return blocks.some(
    (other) =>
      other !== block && other.column === block.column && Math.abs((side === 'below' ? other.y0 : other.y1) - y) <= 2,
  );
}

// Whether the rows of a block next to one edge drift from the block's colour: it fades out there (the blur behind a
// floating bar). The edge row itself, blended with what is next to it, is not looked at.
function fades(image: PixelImage, block: Block, side: 'top' | 'bottom'): boolean {
  const colours = rowColours(image, block);
  const edge = (side === 'bottom' ? colours.slice(-3, -1) : colours.slice(1, 3)).filter((colour) => colour !== null);
  return edge.every((colour) => colourDistance(colour, block.colour) > FADE_DISTANCE);
}

// Whether one of the three rows beyond an edge is plain: the background or a grid line, measured from the picture,
// or the header's band (`headerBand`), which sits right above the first hour.
function plainBeyond(image: PixelImage, block: Block, side: 'top' | 'bottom', headerBand: Colour | null): boolean {
  return [0, 1, 2].some((step) => {
    const y = side === 'bottom' ? block.y1 + step : block.y0 - 1 - step;
    const colour = y >= 0 && y < image.height ? rowColour(image, y, block.x0, block.x1, () => true) : null;
    return (
      colour !== null &&
      (isPlain(image, colour) || (headerBand !== null && colourDistance(colour, headerBand) <= FADE_DISTANCE))
    );
  });
}

// The colour of the day header's band: its row's mean without the letters, between x0 and x1. Null when the row is
// outside the picture.
export function headerBandOf(image: PixelImage, y: number, x0: number, x1: number): Colour | null {
  const row = Math.round(y);
  return row < 0 || row >= image.height
    ? null
    : rowColour(
        image,
        row,
        Math.max(0, Math.round(x0)),
        Math.min(image.width, Math.round(x1)),
        (index) => image.kind[index] !== INK,
      );
}

// ③ Whether a block's end can be trusted. It cannot when the block reaches the picture's bottom, when what is right
// below it is neither the background, a grid line nor another block (it runs under a tab bar), or when it fades out
// towards the bottom (the blur behind a floating tab bar).
export function endIsUncertain(image: PixelImage, block: Block, blocks: readonly Block[] = []): boolean {
  if (block.y1 + 2 >= image.height) {
    return true;
  }
  if (!meetsAnother(block, blocks, block.y1, 'below') && !plainBeyond(image, block, 'bottom', null)) {
    return true;
  }
  return fades(image, block, 'bottom');
}

// The same for a block's start: a timetable scrolled down cuts the blocks at the picture's top or under a bar. A block
// at the first hour, right under a shaded day header, has the header's band above it: that is no bar.
export function startIsUncertain(
  image: PixelImage,
  block: Block,
  blocks: readonly Block[] = [],
  headerBand: Colour | null = null,
): boolean {
  if (block.y0 <= 2) {
    return true;
  }
  if (!meetsAnother(block, blocks, block.y0, 'above') && !plainBeyond(image, block, 'top', headerBand)) {
    return true;
  }
  return fades(image, block, 'top');
}

// How far, in RGB, the colour of the rows next to a block's edge may drift from the block's before the block counts as
// fading out. Apps draw a block in one flat colour, so any steady drift is a gradient; 12 is about 3 % of the RGB
// cube's diagonal, above rounding and blending at the small copy's scale. (On the four reference screenshots the two
// faded blocks drift 20 and 27, the others less than 1.)
export const FADE_DISTANCE = 12;
