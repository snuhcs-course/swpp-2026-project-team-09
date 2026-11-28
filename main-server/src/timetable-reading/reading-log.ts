/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { type LeftOut, type LeftOutReason, LINE_LENGTH } from './reading-checks.js';

// P05 ticket 90: what a timetable reading leaves out is never silent in the server's log. Each block left out is one
// WARN line with what was read of it (its day, start and end, the words read) and why; a call whose failure leaves
// blocks out says so too. Nothing of the User but the class's own words is written.
export const readingLogger = new Logger('TimetableReadingService');

const WHY: Record<LeftOutReason, string> = {
  cut: 'its top or bottom is hidden or fades, so its time is not sure',
  'no-day': 'its day is not a weekday',
  'time-unreadable': 'its start or end is not a time on the hour axis',
  'outside-day': 'its start is not before its end, or it is shorter than 15 minutes',
  'no-name': 'no name with a letter or a digit was read for it',
  'too-long': 'its text is longer than a timetable block holds',
  'name-unchecked': 'the name read is not its lines joined',
  'too-many-times': 'its class has ten times already, or another of its times crosses it',
};

// The line of one block left out: `friday 13:00–15:50, "인공지능특강 …", too-long: its text is longer than …`.
export function leftOutLine({ weekday, start, end, name, reason }: LeftOut): string {
  const words = name === '' ? 'no words' : `"${Array.from(name).slice(0, LINE_LENGTH).join('')}"`;
  return `A timetable reading left out a block: ${weekday ?? 'no day'} ${start ?? '?'}–${end ?? '?'}, ${words}, ${reason}: ${WHY[reason]}`;
}
