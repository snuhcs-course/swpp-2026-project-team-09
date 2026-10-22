/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Column } from './grid';
import { blockMask, closeMask, components } from './mask';
import { columnCoverages, cutAtColumns, narrowRuns, type Part, sideBySide } from './parts';
import { BLOCK, type Colour, colourDistance, FAINT, INK, PLAIN, type PixelImage, rowColour } from './pixels';

// ② The coloured blocks, in the small copy's pixels: x1 and y1 are exclusive.

export interface Block {
  column: Column;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  // Its colour, the median of its rows.
  colour: [number, number, number];
  // Whether its top was cut at the header's bottom: a part of the header band, or a block that ran up into it.
  clippedTop?: boolean;
  // Whether it is one of two classes drawn side by side in one column, each narrower than the column: it is reported
  // as left out, never read as a class.
  narrow?: boolean;
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

// Splits a part where its colour changes for good: two blocks of different colours touching in one column. Steady means
// two rows within 12 of each other (about 3 % of the RGB diagonal, as FADE_DISTANCE); a change is 45 or more, which
// two block colours that a User tells apart exceed. Both predate 2026-10-22 and are checked only on the four reference
// screenshots and the drawn timetables.
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

// What makes a part a block: wide as its column, filled with colour, and at least a quarter of a cell (15 minutes, the
// shortest slot an app draws). The 0.85 of the column's width leaves room for a block's margins; the 0.6 filled leaves
// room for its letters, which the close does not always fill. Both predate 2026-10-22 and are checked only on the four
// reference screenshots and the drawn timetables.
function isBlock(mask: Uint8Array, width: number, part: Part, hourHeight: number): boolean {
  const columnWidth = part.column.right - part.column.left;
  const area = (part.x1 - part.x0) * (part.y1 - part.y0);
  let filled = 0;
  for (let y = part.y0; y < part.y1; y += 1) {
    for (let x = part.x0; x < part.x1; x += 1) {
      filled += mask[y * width + x] ?? 0;
    }
  }
  return part.x1 - part.x0 >= columnWidth * 0.85 && area >= columnWidth * hourHeight * 0.25 && filled >= area * 0.6;
}

function blockOf(image: PixelImage, part: Part, extra: Partial<Block> = {}): Block {
  return {
    column: part.column,
    x0: part.x0,
    x1: part.x1,
    y0: part.y0,
    y1: part.y1,
    colour: medianColour(rowColours(image, part)),
    ...extra,
  };
}

// One part's blocks: split where its colour changes or a separator runs across, without what is too small; or the
// two narrow halves of two classes side by side.
function blocksOf(image: PixelImage, mask: Uint8Array, part: Part, hourHeight: number, clipped: boolean): Block[] {
  const pair = sideBySide(image, part);
  if (pair !== null) {
    return pair.map((half) => blockOf(image, half, { narrow: true }));
  }
  return splitByColour(image, part).flatMap((piece) => {
    const edges = [piece.y0, ...splitAtSeparators(image, piece), piece.y1];
    return edges.slice(1).flatMap((y1, index) => {
      const y0 = (edges[index] ?? piece.y0) + (index > 0 ? 1 : 0);
      const block = { ...piece, y0, y1 };
      return isBlock(mask, image.width, block, hourHeight)
        ? [blockOf(image, block, clipped && y0 === part.y0 ? { clippedTop: true } : {})]
        : [];
    });
  });
}

// The blocks of the picture: the coloured pixels, closed, as connected components cut at the column edges, split
// where their colour changes or a separator runs across, without what is too small. A part running up into the header
// is cut at its bottom (`clippedTop`): the start check then judges it, so that a block under a tinted header band is
// reported rather than lost. The label strip and the tab bar lie outside every column or hold nothing as wide as one.
// Classes drawn side by side at less than a column's width come back `narrow`.
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
  const top = Math.ceil(headerBottom);
  const coverages = columnCoverages(labels, count, width, height, columns);
  const parts = cutAtColumns(coverages, count, height);
  const blocks = parts.flatMap((whole) => {
    const part = { ...whole, y0: Math.max(whole.y0, top) };
    return part.y1 > part.y0 ? blocksOf(image, mask, part, hourHeight, whole.y0 < top) : [];
  });
  for (const part of narrowRuns(coverages, labels, count, image, hourHeight)) {
    if (part.y0 >= top) {
      blocks.push(blockOf(image, part, { narrow: true }));
    }
  }
  return blocks;
}

// Whether another block of the same column meets `block` at row `y` (its top there when `y` is the block's bottom, and
// the other way round): two classes back to back, whose shared edge is real.
function meetsAnother(block: Block, blocks: readonly Block[], y: number, side: 'above' | 'below'): boolean {
  return blocks.some(
    (other) =>
      other !== block &&
      other.narrow !== true &&
      other.column === block.column &&
      Math.abs((side === 'below' ? other.y0 : other.y1) - y) <= 2,
  );
}

// Whether the rows of a block next to one edge drift from the block's colour: it fades out there (the blur behind a
// floating bar). The edge row itself, blended with what is next to it, is not looked at.
function fades(image: PixelImage, block: Block, side: 'top' | 'bottom'): boolean {
  const colours = rowColours(image, block);
  const edge = (side === 'bottom' ? colours.slice(-3, -1) : colours.slice(1, 3)).filter((colour) => colour !== null);
  return edge.every((colour) => colourDistance(colour, block.colour) > FADE_DISTANCE);
}

// The day header's band and the row of the first hour's line, right under it.
export interface HeaderBand {
  colour: Colour;
  firstHourRow: number;
}

// Whether a row of a block's width is plain: most of its pixels (4 in 5) are the background or faint, as a grid line
// is. An opaque bar with icons is not, even when its mean colour is a plain grey; a letter or two of a label is.
function plainRow(image: PixelImage, y: number, x0: number, x1: number): boolean {
  let plain = 0;
  for (let x = x0; x < x1; x += 1) {
    const kind = image.kind[y * image.width + x];
    plain += kind === PLAIN || kind === FAINT ? 1 : 0;
  }
  return plain >= (x1 - x0) * 0.8;
}

// Whether one of the three rows beyond an edge is plain, or, above a block whose top is on the first hour's line, the
// day header's band. Only there: a block cut under a sticky header in a scrolled timetable starts elsewhere.
function plainBeyond(image: PixelImage, block: Block, side: 'top' | 'bottom', band: HeaderBand | null): boolean {
  const onFirstHour = band !== null && Math.abs(block.y0 - band.firstHourRow) <= 2;
  return [0, 1, 2].some((step) => {
    const y = side === 'bottom' ? block.y1 + step : block.y0 - 1 - step;
    if (y < 0 || y >= image.height) {
      return false;
    }
    const colour = rowColour(image, y, block.x0, block.x1, () => true);
    return (
      plainRow(image, y, block.x0, block.x1) ||
      (onFirstHour && colour !== null && colourDistance(colour, band.colour) <= FADE_DISTANCE)
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
// on the first hour's line, right under a shaded day header, has the header's band above it: that is no bar.
export function startIsUncertain(
  image: PixelImage,
  block: Block,
  blocks: readonly Block[] = [],
  headerBand: HeaderBand | null = null,
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
