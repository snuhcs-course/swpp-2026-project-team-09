/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { NativeOcrResult } from './native-ocr';

// One OCR element (a word) in the small copy's pixels, with the line it belongs to.
export interface Word {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confidence: number | null;
  line: number;
}

// The module's lines as words in the small copy's pixels: a box of the original divided by `scale`.
export function wordsOf(result: NativeOcrResult): Word[] {
  const { scale } = result.pixels;
  return result.lines.flatMap((line, index) =>
    line.elements.map((element) => ({
      text: element.text,
      x0: element.box.x / scale,
      y0: element.box.y / scale,
      x1: (element.box.x + element.box.w) / scale,
      y1: (element.box.y + element.box.h) / scale,
      confidence: element.confidence,
      line: index,
    })),
  );
}

export function centreY(word: Word): number {
  return (word.y0 + word.y1) / 2;
}

// How wide a character is drawn compared with a Korean syllable: digits, Latin letters and marks are narrower.
function characterWidth(character: string): number {
  if (/\s/u.test(character)) {
    return 0.35;
  }
  if (/[\d.,:;|'"!()[\]\-/…]/u.test(character)) {
    return 0.6;
  }
  if (/[A-Za-z]/u.test(character)) {
    return 0.65;
  }
  return 1;
}

// The characters of a word with the x of each one's centre, the word's width shared by how wide each is drawn.
export function characterCentres(word: Word): { character: string; x: number }[] {
  const characters = Array.from(word.text);
  const widths = characters.map((character) => characterWidth(character));
  const total = widths.reduce((sum, width) => sum + width, 0);
  const unit = total === 0 ? 0 : (word.x1 - word.x0) / total;
  let left = word.x0;
  return characters.map((character, index) => {
    const width = (widths[index] ?? 0) * unit;
    const centre = left + width / 2;
    left += width;
    return { character, x: centre };
  });
}

// The part of a word whose characters sit between x0 and x1: a word that runs over a column's edge or starts in the
// hour labels' strip ("2자료구조", "기컴퓨터프로그래" whose 기 is the label 7 misread) keeps only what is inside.
export function clipWord(word: Word, x0: number, x1: number): string {
  if (word.x0 >= x0 && word.x1 <= x1) {
    return word.text;
  }
  return characterCentres(word)
    .filter(({ x }) => x >= x0 && x < x1)
    .map(({ character }) => character)
    .join('')
    .trim();
}

// The confidence of some words weighted by their characters, or null when any of them has none (iOS).
export function meanConfidence(parts: readonly { text: string; confidence: number | null }[]): number | null {
  let sum = 0;
  let count = 0;
  for (const { text, confidence } of parts) {
    if (confidence === null) {
      return null;
    }
    const length = Array.from(text).length;
    sum += confidence * length;
    count += length;
  }
  return count === 0 ? null : sum / count;
}
