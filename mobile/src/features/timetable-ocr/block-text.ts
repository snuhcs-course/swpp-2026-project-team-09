/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
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
  // ML Kit's confidence, character-weighted over its words; null on iOS. Only a room's link reads it.
  confidence: number | null;
  // Whether the line is a single OCR element read whole.
  oneElement: boolean;
  // Whether no element was cut at the block's sides: a room cut at a column edge (`43-1-304` → `3-1-304`) can still
  // match the room pattern, and must not be linked.
  unclipped: boolean;
  // The left edge of its first word and the right edge of its last inside the block, and the bottom of its words.
  x0: number;
  x1: number;
  y1: number;
}

// The first room of a block's room part, as `linkRoom` needs it.
export interface RoomText {
  // The room with the spaces around its hyphens removed, "302-311-1"; or the room part as read when no complete room
  // starts it, which then matches no room and links nothing.
  text: string;
  // Whether none of the room part's words was cut at the block's sides.
  unclipped: boolean;
  confidence: number | null;
  // Whether the room was read inside one OCR element read whole.
  oneElement: boolean;
}

export interface BlockText {
  name: string;
  room: RoomText | null;
  // Whether the name shows a sign of being cut short: its last line runs to the block's right edge or bottom, so
  // that what follows may be on a line not read, or a word of it was cut at the block's side.
  cut: boolean;
  // Whether the name was printed cut, with `…` (or `...`): it is certainly the start of a longer name.
  marked: boolean;
}

// The room a line reads, with the spaces around its hyphens removed, or null when the line is not one.
export function roomOf(text: string): string | null {
  const room = text.trim().replaceAll(/\s*-\s*/gu, '-');
  return ROOM_PATTERN.test(room) ? room : null;
}

interface Piece {
  text: string;
  confidence: number | null;
  x0: number;
  x1: number;
  y: number;
  y1: number;
  whole: boolean;
}

// The words of one OCR line inside a block, as one line.
function lineOf(pieces: readonly Piece[]): BlockLine {
  const ordered = pieces.toSorted((one, other) => one.x0 - other.x0);
  return {
    text: ordered.map((piece) => piece.text).join(' '),
    y: pieces.reduce((sum, piece) => sum + piece.y, 0) / pieces.length,
    confidence: meanConfidence(pieces),
    oneElement: pieces.length === 1 && (pieces[0]?.whole ?? false),
    unclipped: pieces.every((piece) => piece.whole),
    x0: Math.min(...pieces.map((piece) => piece.x0)),
    x1: Math.max(...pieces.map((piece) => piece.x1)),
    y1: Math.max(...pieces.map((piece) => piece.y1)),
  };
}

// The lines inside a box, top to bottom: each word whose centre row is inside, cut to the characters inside the box's
// columns, grouped by its OCR line.
export function linesIn(words: readonly Word[], box: { x0: number; x1: number; y0: number; y1: number }): BlockLine[] {
  const byLine = new Map<number, Piece[]>();
  for (const word of words) {
    const y = centreY(word);
    const text =
      y >= box.y0 && y < box.y1 && word.x1 > box.x0 && word.x0 < box.x1 ? clipWord(word, box.x0, box.x1) : '';
    if (text !== '') {
      const pieces = byLine.get(word.line) ?? [];
      pieces.push({
        text,
        confidence: word.confidence,
        x0: Math.max(word.x0, box.x0),
        x1: Math.min(word.x1, box.x1),
        y,
        y1: word.y1,
        whole: text === word.text,
      });
      byLine.set(word.line, pieces);
    }
  }
  return [...byLine.values()].map((pieces) => lineOf(pieces)).toSorted((one, other) => one.y - other.y);
}

const JOINS_WITH_SPACE = /[A-Za-z0-9]/u;

// The name lines joined: Korean lines without a space, a join where either side is a Latin letter or a digit with one
// (`공학수학` + `2` → `공학수학 2`). A name cut with `…` keeps the part read; a stray `|` (a block's edge read as a
// letter) is dropped. At most 30 characters.
export function joinName(lines: readonly string[]): string {
  let name = '';
  for (const line of lines) {
    const text = line.replaceAll(/^[|\s]+|[|\s]+$/gu, '');
    if (text !== '') {
      const last = name.at(-1) ?? '';
      const space = JOINS_WITH_SPACE.test(last) || JOINS_WITH_SPACE.test(text[0] ?? '');
      name = name === '' ? text : `${name}${space ? ' ' : ''}${text}`;
    }
  }
  const cleaned = name.replace(/(?:…|\.{2,})\s*$/u, '').trim();
  return Array.from(cleaned).slice(0, NAME_LENGTH).join('').trim();
}

// A line of a room part holds only what rooms are written with: digits, capitals, hyphens, and the `/` or `,` between
// several rooms (`61-320/61-102/…`, wrapped over lines), or a `…` where it was cut.
const ROOM_CHARACTERS = /^[\dA-Z\s\-/,.…]+$/u;

// A room part starts with a building number and a hyphen; it goes on over the lines of room characters after it.
function startsRooms(text: string): boolean {
  return ROOM_CHARACTERS.test(text) && /^\d{1,3}\s*-/u.test(text.trim());
}

function continuesRooms(text: string): boolean {
  return ROOM_CHARACTERS.test(text) && /\d/u.test(text) && /[-/,]/u.test(text);
}

// The first room of a room part. Within a line the spaces around `-`, `/` and `,` go; lines join without a space
// where one ends or the next starts with one of them (a wrap inside a list), and with a space otherwise, so that a
// room broken at a wrap matches no room rather than another one.
function roomTextOf(lines: readonly BlockLine[]): RoomText {
  let joined = '';
  for (const line of lines) {
    const text = line.text.trim().replaceAll(/\s*([-/,])\s*/gu, '$1');
    const tight = joined === '' || /[-/,]$/u.test(joined) || /^[-/,]/u.test(text);
    joined = `${joined}${tight ? '' : ' '}${text}`;
  }
  const [first = '', ...rest] = joined.split(/[/,]/u);
  const firstLine = lines[0];
  // The first room is read inside the first line's one element when it ends there: the line is the whole room part,
  // or the line holds the `/` or `,` after it.
  const endsInFirstLine = lines.length === 1 || /[/,]/u.test(firstLine?.text ?? '');
  return {
    text: rest.length > 0 || roomOf(first) !== null ? first : joined,
    unclipped: lines.every((line) => line.unclipped),
    confidence: meanConfidence(lines),
    oneElement: endsInFirstLine && (firstLine?.oneElement ?? false),
  };
}

// A block's name and room. Below the first line, the room part starts at a line that begins with a building number
// and a hyphen and holds only room characters, and runs over the lines like it; its first room is the block's room.
// The other lines are the name. Bold or small type is not used: SNUTT draws the room bold, 에브리타임 small. A block
// whose every line is a room has no name: it is not a class named after its room.
export function blockText(lines: readonly BlockLine[], box?: { x1: number; y1: number }): BlockText {
  const onlyRooms =
    lines.every((line) => roomOf(line.text) !== null) ||
    (startsRooms(lines[0]?.text ?? '') && lines.every((line) => startsRooms(line.text) || continuesRooms(line.text)));
  if (lines.length > 0 && onlyRooms) {
    return { name: '', room: roomTextOf(lines), cut: false, marked: false };
  }
  const start = lines.findIndex((line, index) => index > 0 && startsRooms(line.text));
  let end = start;
  if (start >= 0) {
    while (end + 1 < lines.length && continuesRooms(lines[end + 1]?.text ?? '')) {
      end += 1;
    }
  }
  const roomLines = start < 0 ? [] : lines.slice(start, end + 1);
  const nameLines = lines.filter((_, index) => start < 0 || index < start || index > end);
  return {
    name: joinName(nameLines.map((line) => line.text)),
    room: roomLines.length === 0 ? null : roomTextOf(roomLines),
    cut: box !== undefined && looksCut(nameLines, box),
    marked: /(?:…|\.{2,})\s*$/u.test(nameLines.at(-1)?.text ?? ''),
  };
}

// Whether a name's lines show a sign of being cut short: a word cut at the block's side, or a last line with no room
// for one more character before the block's right edge, or for one more line before its bottom.
export function looksCut(lines: readonly BlockLine[], box: { x1: number; y1: number }): boolean {
  const last = lines.at(-1);
  if (last === undefined) {
    return false;
  }
  const characterWidth = (last.x1 - last.x0) / Math.max(1, Array.from(last.text).length);
  const lineHeight = (last.y1 - last.y) * 2;
  return lines.some((line) => !line.unclipped) || last.x1 + characterWidth > box.x1 || last.y1 + lineHeight > box.y1;
}
