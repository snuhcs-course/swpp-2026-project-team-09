/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { endIsUncertain, findBlocks, startIsUncertain } from './blocks';
import { columnsFromGridLines } from './grid';
import type { OcrPixels } from './native-ocr';
import { decodePixels } from './pixels';

// P15-52: the class blocks of a timetable screenshot from its pixels alone, for the main server's reader: each block's
// day column (counted from the left), its top and bottom in the picture's pixels, its colour, and whether its bottom
// fades out. No text is used, so no OCR'd label can misplace anything: the server's AI reads the labels and each
// block's rough times and text, and the server fits the pixels to those times (`grid-mapping.ts` there).

export interface GridBlock {
  // The day column, from 0 at the left.
  column: number;
  // Its top and bottom, in the picture's pixels.
  top: number;
  bottom: number;
  colour: [number, number, number];
  // Its bottom fades out or runs under a bar: `bottom` is where its colour is last seen.
  fades: boolean;
}

export interface GridGeometry {
  columns: number;
  blocks: GridBlock[];
}

// A block the pixels found and do not send, as the phone's own reader would leave it out: two classes side by side,
// or a block cut at its top. The import counts it among what it could not add.
export interface SkippedBlock {
  column: number;
  reason: 'too-narrow' | 'start-uncertain';
}

// The blocks of the small copy the native module gives, or null when no evenly spaced day columns are found: the AI
// then reads the whole picture. A block cut at its top (a scrolled timetable) or drawn side by side with another is
// not among them but in `skipped`, which stays on the phone and is counted with what the server left out.
export function gridGeometry(pixels: OcrPixels): (GridGeometry & { skipped: SkippedBlock[] }) | null {
  const image = decodePixels(pixels);
  const columns = columnsFromGridLines(image, image.height * 0.1, image.height * 0.9);
  if (columns === null || columns.length === 0) {
    return null;
  }
  // An hour is at least a fortieth of a phone screenshot's height; a quarter of it is the smallest block kept.
  const found = findBlocks(image, columns, image.height / 40, 0);
  const { scale } = pixels;
  const skipped: SkippedBlock[] = [];
  const blocks = found.flatMap((block): GridBlock[] => {
    const column = columns.findIndex((one) => one.weekday === block.column.weekday);
    if (block.narrow === true || startIsUncertain(image, block, found)) {
      skipped.push({ column, reason: block.narrow === true ? 'too-narrow' : 'start-uncertain' });
      return [];
    }
    const [red, green, blue] = block.colour;
    return [
      {
        column,
        top: block.y0 * scale,
        bottom: block.y1 * scale,
        colour: [Math.round(red), Math.round(green), Math.round(blue)],
        fades: endIsUncertain(image, block, found),
      },
    ];
  });
  return { columns: columns.length, blocks, skipped };
}
