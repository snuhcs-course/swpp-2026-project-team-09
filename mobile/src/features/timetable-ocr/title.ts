/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { OcrLine } from './native-ocr';

// ⑥ The screenshot's title, which names the new version.

export const TITLE_LENGTH = 20;
// The top of the picture that the phone's status bar takes (its clock, `1:04`).
const STATUS_BAR = 0.06;
// A word read with less confidence than this is left out of the title: a chevron read as `<` (0.06).
const TITLE_WORD_CONFIDENCE = 0.3;
// Words the apps draw beside the title that are no title: 에브리타임's screen heading.
const NOT_TITLES = new Set(['시간표']);

// The title: of the lines between the status bar and the day header, the tallest that holds a letter and is not a
// credit count (`17학점`), cut to 20 characters. Null when there is none: the version is then `새 시간표 N`.
export function findTitle(lines: readonly OcrLine[], imageHeight: number, headerTop: number): string | null {
  let best: { text: string; height: number } | null = null;
  for (const line of lines) {
    const centre = line.box.y + line.box.h / 2;
    if (centre > imageHeight * STATUS_BAR && line.box.y + line.box.h <= headerTop) {
      const text = line.elements
        .filter((element) => element.confidence === null || element.confidence >= TITLE_WORD_CONFIDENCE)
        .map((element) => element.text)
        .join(' ')
        .replaceAll(/[^\p{L}\p{N}\s()\-_.]/gu, '')
        .replaceAll(/\s+/gu, ' ')
        .trim();
      const titled = /[\p{Script=Hangul}A-Za-z]/u.test(text) && !/^\d+\s*학점$/u.test(text) && !NOT_TITLES.has(text);
      if (titled && (best === null || line.box.h > best.height)) {
        best = { text, height: line.box.h };
      }
    }
  }
  return best === null ? null : Array.from(best.text).slice(0, TITLE_LENGTH).join('').trim();
}
