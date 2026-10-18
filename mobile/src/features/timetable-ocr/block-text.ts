/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { centreY, clipWord, meanConfidence, type Word } from './words';

// ④ A block's name and room, from the OCR lines inside it.

// A room as SNUTT and 에브리타임 print it: a building number and up to three more parts (`302-311-1`, `43-2-B101`,
// `500-L308`, `43-1`, `26-404`).
export const ROOM_PATTERN = /^\d{1,3}(?:-[A-Z]?\d{1,4}){0,3}$/u;
export const NAME_LENGTH = 30;

// One OCR line as far as it lies inside a block.
export interface BlockLine {
  text: string;
  y: number;
  confidence: number | null;
  // How many OCR elements it is made of.
  elements: number;
  // Whether one of its elements is exactly the whole line, as a room read as one word is.
  wholeElement: boolean;
}

export interface BlockText {
  name: string;
  nameConfidence: number | null;
  // The room line as read, only when one matched the room pattern.
  room: BlockLine | null;
  // How many lines are not the room.
  nameLines: number;
}

// The room a line reads, with the spaces around its hyphens removed, or null when the line is not one.
export function roomOf(text: string): string | null {
  const room = text.trim().replaceAll(/\s*-\s*/gu, '-');
  return ROOM_PATTERN.test(room) ? room : null;
}

// The lines inside a box, top to bottom: each word whose centre row is inside, cut to the characters inside the box's
// columns, grouped by its OCR line.
export function linesIn(words: readonly Word[], box: { x0: number; x1: number; y0: number; y1: number }): BlockLine[] {
  const byLine = new Map<number, { text: string; x: number; y: number; confidence: number | null; whole: boolean }[]>();
  for (const word of words) {
    const y = centreY(word);
    if (y >= box.y0 && y < box.y1 && word.x1 > box.x0 && word.x0 < box.x1) {
      const text = clipWord(word, box.x0, box.x1);
      if (text !== '') {
        const pieces = byLine.get(word.line) ?? [];
        pieces.push({ text, x: word.x0, y, confidence: word.confidence, whole: text === word.text });
        byLine.set(word.line, pieces);
      }
    }
  }
  return [...byLine.values()]
    .map((pieces) => {
      const ordered = pieces.toSorted((one, other) => one.x - other.x);
      const text = ordered.map((piece) => piece.text).join(' ');
      return {
        text,
        y: pieces.reduce((sum, piece) => sum + piece.y, 0) / pieces.length,
        confidence: meanConfidence(pieces),
        elements: pieces.length,
        wholeElement: pieces.length === 1 && (pieces[0]?.whole ?? false),
      };
    })
    .toSorted((one, other) => one.y - other.y);
}

const JOINS_WITH_SPACE = /[A-Za-z0-9]/u;

// The name lines joined: Korean lines without a space, a join between Latin letters or digits with one. A name cut
// with `…` keeps the part read; a stray `|` (a block's edge read as a letter) is dropped. At most 30 characters.
export function joinName(lines: readonly string[]): string {
  let name = '';
  for (const line of lines) {
    const text = line.replaceAll(/^[|\s]+|[|\s]+$/gu, '');
    if (text !== '') {
      const last = name.at(-1) ?? '';
      const space = JOINS_WITH_SPACE.test(last) && JOINS_WITH_SPACE.test(text[0] ?? '');
      name = name === '' ? text : `${name}${space ? ' ' : ''}${text}`;
    }
  }
  const cleaned = name.replace(/(?:…|\.{2,})\s*$/u, '').trim();
  return Array.from(cleaned).slice(0, NAME_LENGTH).join('').trim();
}

// A block's name and room: a line below the first that matches the room pattern is the room (the last such line);
// the others are the name. Bold or small type is not used: SNUTT draws the room bold, 에브리타임 small.
export function blockText(lines: readonly BlockLine[]): BlockText {
  let roomIndex = -1;
  lines.forEach((line, index) => {
    if (index > 0 && roomOf(line.text) !== null) {
      roomIndex = index;
    }
  });
  const nameLines = lines.filter((_, index) => index !== roomIndex);
  return {
    name: joinName(nameLines.map((line) => line.text)),
    nameConfidence: meanConfidence(nameLines),
    room: lines[roomIndex] ?? null,
    nameLines: nameLines.length,
  };
}
