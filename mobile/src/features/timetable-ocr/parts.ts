/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Column } from './grid';
import { BLOCK, type Colour, colourDistance, type PixelImage } from './pixels';

// ② The parts of the blocks' components that each column holds: the cut at the column edges, and the classes drawn
// side by side at less than a column's width. `blocks.ts` turns parts into blocks.

export interface Part {
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
export function runs(length: number, full: (index: number) => boolean): [number, number][] {
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

// One column's pixel range and how many pixels of each component each of its rows holds, counted once for the cut
// at the column edges and for narrow classes.
export interface ColumnCoverage {
  column: Column;
  x0: number;
  x1: number;
  covered: Int32Array;
}

export function columnCoverages(
  labels: Int32Array,
  count: number,
  width: number,
  height: number,
  columns: readonly Column[],
): ColumnCoverage[] {
  return columns.flatMap((column) => {
    const x0 = Math.max(0, Math.ceil(column.left));
    const x1 = Math.min(width, Math.floor(column.right));
    return x1 <= x0 ? [] : [{ column, x0, x1, covered: coverage(labels, count, width, height, x0, x1) }];
  });
}

// Each component cut at the column edges: within one column, the runs of rows where the component covers at least
// half the width. Two same-coloured blocks side by side (근장 on 수 and 목) become two.
export function cutAtColumns(coverages: readonly ColumnCoverage[], count: number, height: number): Part[] {
  return coverages.flatMap(({ column, x0, x1, covered }) => {
    const parts: Part[] = [];
    for (let label = 1; label <= count; label += 1) {
      for (const [y0, y1] of runs(height, (y) => (covered[label * height + y] ?? 0) >= (x1 - x0) * 0.5)) {
        parts.push({ label, column, x0, x1, y0, y1 });
      }
    }
    return parts;
  });
}

// The mean colour of the block pixels in pixel columns x0 to x1 of a part's rows, or null when there are none.
function columnsColour(image: PixelImage, part: Part, x0: number, x1: number): Colour | null {
  const sum: Colour = [0, 0, 0];
  let count = 0;
  for (let y = part.y0; y < part.y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const index = y * image.width + x;
      if (image.kind[index] === BLOCK) {
        sum[0] += image.rgba[index * 4] ?? 0;
        sum[1] += image.rgba[index * 4 + 1] ?? 0;
        sum[2] += image.rgba[index * 4 + 2] ?? 0;
        count += 1;
      }
    }
  }
  return count === 0 ? null : [sum[0] / count, sum[1] / count, sum[2] / count];
}

// Two classes side by side in one column, as an app draws two that overlap in time: the part's left and right thirds
// differ in colour as two blocks do (45, as in splitByColour). They are cut where the colour turns. Two of one colour
// cannot be told from one block.
export function sideBySide(image: PixelImage, part: Part): Part[] | null {
  const third = Math.floor((part.x1 - part.x0) / 3);
  const left = columnsColour(image, part, part.x0, part.x0 + third);
  const right = columnsColour(image, part, part.x1 - third, part.x1);
  if (third < 2 || left === null || right === null || colourDistance(left, right) < 45) {
    return null;
  }
  let split = part.x0 + third;
  while (split < part.x1 - third) {
    const colour = columnsColour(image, part, split, split + 1);
    if (colour !== null && colourDistance(colour, right) < colourDistance(colour, left)) {
      break;
    }
    split += 1;
  }
  return [
    { ...part, x1: split },
    { ...part, x0: split },
  ];
}

// The x range and the pixel count of component `label` within a column over rows y0 to y1.
function extent(
  labels: Int32Array,
  width: number,
  label: number,
  area: Part,
): { x0: number; x1: number; pixels: number } {
  let [left, right, pixels] = [area.x1, area.x0, 0];
  for (let y = area.y0; y < area.y1; y += 1) {
    for (let x = area.x0; x < area.x1; x += 1) {
      if (labels[y * width + x] === label) {
        left = Math.min(left, x);
        right = Math.max(right, x + 1);
        pixels += 1;
      }
    }
  }
  return { x0: left, x1: right, pixels };
}

// Runs of rows in which a component covers a third to a half of a column's width, at least a quarter of a cell long
// and filled, in pairs within one column: two classes drawn at half width side by side, apart by more than the close
// bridges (each may be joined to a block of the next column, which the close bridges). Their x range is the
// component's within the column over the run. A lone one is no class (a bar of a widget below the grid, say): classes
// are drawn narrow only beside another.
export function narrowRuns(
  coverages: readonly ColumnCoverage[],
  labels: Int32Array,
  count: number,
  image: PixelImage,
  hourHeight: number,
): Part[] {
  const { width, height } = image;
  const found = coverages.flatMap(({ column, x0, x1, covered }) => {
    const parts: Part[] = [];
    for (let label = 1; label <= count; label += 1) {
      const narrow = (y: number): boolean => {
        const share = (covered[label * height + y] ?? 0) / (x1 - x0);
        return share >= 1 / 3 && share < 0.5;
      };
      for (const [y0, y1] of runs(height, narrow)) {
        const box = extent(labels, width, label, { label, column, x0, x1, y0, y1 });
        if (y1 - y0 >= hourHeight * 0.25 && box.x1 > box.x0 && box.pixels >= (box.x1 - box.x0) * (y1 - y0) * 0.6) {
          parts.push({ label, column, x0: box.x0, x1: box.x1, y0, y1 });
        }
      }
    }
    return parts;
  });
  return found.filter((one) =>
    found.some((other) => other !== one && other.column === one.column && other.y0 < one.y1 && one.y0 < other.y1),
  );
}
