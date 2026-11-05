/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { isApplicationAt } from './application-lines.js';
import { type AnsweredSession } from './judgement-answer.js';
import { isWrittenDay, type JudgedTime, type WrittenClock, writtenTimes } from './judgement-time.js';

// The check timesConsistent: a post that writes the session's day twice with two times leaves it unknown which is right,
// whichever line the model quoted. Only a line that writes a day with a time is read, so that a programme's running
// order is not, nor is an application period.

// The worker's line for one session of an extra.snu programme: "[2회차] 기간: …".
const SESSION_LINE = /^\[(\d+)회차\]/u;

// The session's number among those lines: the one the post's line its start is quoted from carries, else its place in
// the answer, from 1.
export function sessionNumber({ lines: quoted }: AnsweredSession, position: number, lines: string[]): number {
  const pieces = quoted.start.map((piece) => piece.trim()).filter((piece) => piece !== '');
  const carried = lines
    .filter((line) => pieces.some((piece) => line.includes(piece)))
    .map((line) => SESSION_LINE.exec(line)?.[1])
    .find((number) => number !== undefined);
  return carried === undefined ? position + 1 : Number(carried);
}

function agrees(written: WrittenClock, clock: JudgedTime['clock']): boolean {
  return clock === null || (written.minute === clock.minute && written.hours.includes(clock.hour));
}

// Fails when a line for the session's day writes another start, or another end. A line with a start alone leaves the
// end to the line that has one, and "오후 2시" is 14:00.
export function timesConsistent(
  number: number,
  start: JudgedTime | null,
  end: JudgedTime | null,
  lines: string[],
  now: Date,
): boolean {
  if (start === null || start.clock === null) {
    return true;
  }
  return lines.every((line, index) => {
    const numbered = SESSION_LINE.exec(line);
    if ((numbered !== null && Number(numbered[1]) !== number) || isApplicationAt(lines, index)) {
      return true;
    }
    return writtenTimes(line)
      .filter(({ day }) => isWrittenDay(day, start, now))
      .every((time) => agrees(time.start, start.clock) && (time.end === null || agrees(time.end, end?.clock ?? null)));
  });
}
