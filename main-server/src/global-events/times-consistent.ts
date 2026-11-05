/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { APPLICATION, isApplicationAt } from './application-lines.js';
import { type AnsweredSession } from './judgement-answer.js';
import { isWrittenDay, type JudgedTime, type WrittenClock, writtenDays, writtenTimes } from './judgement-time.js';

// The check timesConsistent: a post that writes the session's day twice with two times leaves it unknown which is right,
// whichever line the model quoted. Only a line that writes a day with a time is read, so that a programme's running
// order is not, nor is an application period. A day and its time may be written on two lines, "일시: 11월 3일" above
// "시간: 19:00 ~ 21:00", and are then read as one; times listed under a day are a running order, and are not.

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

// A line that gives the time as a field, "시간: 19:00 ~ 21:00" or "진행 시간: …", not an item of a running order.
const TIME_FIELD = /^[\s\-*·•※■□●○▶>]*(?:[가-힣]{1,4}\s*)?(?:시간|time)\s*[:：]/iu;

// The line as read: a time field under a line of a day alone is read after that day.
function readLine(lines: string[], index: number): string {
  const line = lines[index] ?? '';
  const above = lines[index - 1];
  const dayAlone = above !== undefined && writtenDays(above).length > 0 && writtenTimes(above).length === 0;
  return dayAlone && TIME_FIELD.test(line) && writtenDays(line).length === 0 ? `${above} ${line}` : line;
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
  return lines.every((_, index) => {
    const line = readLine(lines, index);
    const numbered = SESSION_LINE.exec(line);
    if (
      (numbered !== null && Number(numbered[1]) !== number) ||
      isApplicationAt(lines, index) ||
      APPLICATION.test(line)
    ) {
      return true;
    }
    return writtenTimes(line)
      .filter(({ day }) => isWrittenDay(day, start, now))
      .every((time) => agrees(time.start, start.clock) && (time.end === null || agrees(time.end, end?.clock ?? null)));
  });
}
