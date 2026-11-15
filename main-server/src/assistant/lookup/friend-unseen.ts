/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine, type Lookup } from '../dto/answer.dto.js';
import { clockOf, type DayItem } from '../free-time/free-time.js';
import { type PlaceNaming } from '../gathering/place-naming.js';
import { part } from './way-naming.js';

// The Friend Lookup's words beside a refusal of what the map does not show of a Friend, their course and room (board
// n4).

// Where and when their Class ends, which the Timetable shows every Friend, while it goes on in a Place; else the
// Lookup's first line.
export function unseenLine(
  classes: readonly DayItem[],
  now: Date,
  lines: readonly AnswerLine[],
  naming: PlaceNaming,
): AnswerLine {
  const current = classes.find(({ start, end }) => start <= now && now < end);
  if (current === undefined || current.placeId === null) {
    return lines[0] ?? [];
  }
  return [part(clockOf(current.end), true), part(`에 ${naming.placeLabel(current.placeId)}에서 수업이 끝나요`)];
}

// The chip of a Friend the map shows through the Timetable only, drawn dashed or not drawn, says so.
export function withTimetableChip(lookup: Lookup): Lookup {
  const timetableOnly = lookup.scene.people.every(({ source }) => source === 'timetable');
  if (lookup.kind !== 'friend' || !timetableOnly) {
    return lookup;
  }
  const chips = lookup.chips.map((chip) =>
    chip.kind === 'person' ? { ...chip, text: `${chip.text} · 시간표` } : chip,
  );
  return { ...lookup, chips };
}
