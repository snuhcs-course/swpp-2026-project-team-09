/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { NativeOcrResult, OcrLine } from '@/features/timetable-ocr/native-ocr';

import everytime2Pixels from '../fixtures/timetable-ocr/everytime-2.pixels.json';
import everytime2Truth from '../fixtures/timetable-ocr/everytime-2.truth.json';
import everytimeDark1Pixels from '../fixtures/timetable-ocr/everytime-dark-1.pixels.json';
import everytimeDark1Truth from '../fixtures/timetable-ocr/everytime-dark-1.truth.json';
import snutt4Pixels from '../fixtures/timetable-ocr/snutt-4.pixels.json';
import snutt4Truth from '../fixtures/timetable-ocr/snutt-4.truth.json';
import snuttDark1Pixels from '../fixtures/timetable-ocr/snutt-dark-1.pixels.json';
import snuttDark1Truth from '../fixtures/timetable-ocr/snutt-dark-1.truth.json';
import snuttGrey1Pixels from '../fixtures/timetable-ocr/snutt-grey-1.pixels.json';
import snuttGrey1Truth from '../fixtures/timetable-ocr/snutt-grey-1.truth.json';
import { type Truth, truthOf } from './timetable-ocr';

// The five screenshots of P15-52 (921 × 2000, iPhone), which the app read badly in use. Their ground truth is
// committed beside their PNGs, which their owner agreed on 2026-11-18 may be public. No ML Kit output was saved for
// them (no device run in P15-52): `readable` gives the PNG's small copy with stand-ins for only the words that place the grid
// (the day letters and the hour labels, boxes measured on the picture), so that the pipeline's pixel half is measured
// on its own.

export const NEW_SCREENSHOTS = ['everytime-2', 'everytime-dark-1', 'snutt-4', 'snutt-dark-1', 'snutt-grey-1'] as const;
export type NewScreenshot = (typeof NEW_SCREENSHOTS)[number];

// Each PNG's small copy as the native module makes it, saved by `main-server/eval/timetable-reading/pixels.ts`.
const PIXELS: Record<NewScreenshot, { width: number; height: number; pixels: NativeOcrResult['pixels'] }> = {
  'everytime-2': everytime2Pixels,
  'everytime-dark-1': everytimeDark1Pixels,
  'snutt-4': snutt4Pixels,
  'snutt-dark-1': snuttDark1Pixels,
  'snutt-grey-1': snuttGrey1Pixels,
};

const TRUTHS: Record<NewScreenshot, Truth> = {
  'everytime-2': truthOf(everytime2Truth),
  'everytime-dark-1': truthOf(everytimeDark1Truth),
  'snutt-4': truthOf(snutt4Truth),
  'snutt-dark-1': truthOf(snuttDark1Truth),
  'snutt-grey-1': truthOf(snuttGrey1Truth),
};

export function newTruth(name: NewScreenshot): Truth {
  return TRUTHS[name];
}

interface Layout {
  // The day letters' row and each letter's centre, in the screenshot's pixels.
  header: { top: number; bottom: number; centres: number[]; days: string[] };
  // Each hour label as printed, with its box.
  labels: { text: string; x0: number; x1: number; y0: number; y1: number }[];
}

const SNUTT_CENTRES = [129, 305, 481, 657, 832];

function labels(texts: readonly string[], tops: readonly number[], x0: number, x1: number): Layout['labels'] {
  return texts.map((text, index) => ({ text, x0, x1, y0: tops[index] ?? 0, y1: (tops[index] ?? 0) + 18 }));
}

const DARK_TOPS = [312, 439, 567, 695, 822, 950, 1078, 1204, 1332, 1460, 1587, 1715, 1843];
const HOURS_9_TO_21 = ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];

const LAYOUTS: Record<NewScreenshot, Layout> = {
  'everytime-2': {
    header: { top: 290, bottom: 311, centres: [144, 313, 483, 652, 822], days: ['월', '화', '수', '목', '금'] },
    labels: labels(
      ['9', '10', '11', '12', '1', '2', '3', '4', '5', '6'],
      [330, 423, 518, 612, 706, 800, 894, 989, 1083, 1177],
      36,
      57,
    ),
  },
  'everytime-dark-1': {
    header: { top: 290, bottom: 311, centres: [144, 313, 483, 652, 822], days: ['월', '화', '수', '목', '금'] },
    labels: labels(['9', '10', '11', '12', '1', '2', '3', '4'], [330, 424, 518, 612, 706, 800, 894, 989], 36, 57),
  },
  'snutt-4': {
    header: { top: 258, bottom: 280, centres: SNUTT_CENTRES, days: ['월', '화', '수', '목', '금'] },
    labels: labels(
      ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
      [312, 482, 652, 822, 992, 1162, 1332, 1502, 1673, 1843],
      8,
      33,
    ),
  },
  'snutt-dark-1': {
    header: { top: 258, bottom: 280, centres: SNUTT_CENTRES, days: ['월', '화', '수', '목', '금'] },
    labels: labels(HOURS_9_TO_21, DARK_TOPS, 8, 33),
  },
  // The focus-mode overlay covers 금 with an icon.
  'snutt-grey-1': {
    header: { top: 260, bottom: 282, centres: SNUTT_CENTRES.slice(0, 4), days: ['월', '화', '수', '목'] },
    labels: labels(HOURS_9_TO_21, DARK_TOPS, 8, 33),
  },
};

function word(text: string, x: number, y: number, w: number, h: number): OcrLine {
  const box = { x, y, w, h };
  return { text, box, confidence: null, elements: [{ text, box, confidence: null }] };
}

// The PNG's small copy, with stand-ins for the day letters and the hour labels only: no text in any block.
export function gridOnly(name: NewScreenshot): NativeOcrResult {
  const image = PIXELS[name];
  const { header, labels: hourLabels } = LAYOUTS[name];
  const lines = [
    ...header.days.map((day, index) =>
      word(day, (header.centres[index] ?? 0) - 9, header.top, 18, header.bottom - header.top),
    ),
    ...hourLabels.map((label) => word(label.text, label.x0, label.y0, label.x1 - label.x0, label.y1 - label.y0)),
  ];
  return { width: image.width, height: image.height, lines, pixels: image.pixels };
}
