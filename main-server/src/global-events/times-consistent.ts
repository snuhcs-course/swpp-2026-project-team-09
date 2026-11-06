/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { isApplicationLabelled } from './application-lines.js';
import {
  isWrittenDay,
  type JudgedTime,
  type WrittenClock,
  type WrittenTime,
  writtenDays,
  writtenTimes,
} from './judgement-time.js';

// The check timesConsistent: a post that writes the session's day twice with two times leaves it unknown which is right,
// whichever line the model quoted. Only a line that writes a day with a time is read, so that a programme's running
// order is not, nor is an application period. A day and its time may be written on two lines, "일시: 11월 3일" above
// "시간: 19:00 ~ 21:00", and are then read as one; times listed under a day are a running order, and are not.

// The worker's line for one session of an extra.snu programme: "[2회차] 기간: …".
const SESSION_LINE = /^\[(\d+)회차\]/u;

// The session's number among those lines: the one the post's line its start is quoted from carries, else its place in
// the answer, from 1. `pieces` are the start's quotes, normalised as the post's lines are.
export function sessionNumber(pieces: string[], position: number, lines: string[]): number {
  const carried = lines
    .filter((line) => pieces.some((piece) => piece !== '' && line.includes(piece)))
    .map((line) => SESSION_LINE.exec(line)?.[1])
    .find((number) => number !== undefined);
  return carried === undefined ? position + 1 : Number(carried);
}

// A line that gives the time as a field, "시간: 19:00 ~ 21:00" or "진행 시간: …", not an item of a running order, nor
// "휴식 시간: …".
const TIME_FIELD = /^[\s\-*·•※■□●○▶>]*(?:(?:진행|행사|강의|교육|수업|활동|운영)\s*)?(?:시간|time)\s*[:：]/iu;

// The line as read, and the index of its first line: a time field under a line of a day alone is read after that day.
function readLine(lines: string[], index: number): { line: string; from: number } {
  const line = lines[index] ?? '';
  const above = lines[index - 1];
  const dayAlone = above !== undefined && writtenDays(above).length > 0 && writtenTimes(above).length === 0;
  return dayAlone && TIME_FIELD.test(line) && writtenDays(line).length === 0
    ? { line: `${above} ${line}`, from: index - 1 }
    : { line, from: index };
}

function agrees(written: WrittenClock, clock: JudgedTime['clock']): boolean {
  return clock === null || (written.minute === clock.minute && written.hours.includes(clock.hour));
}

// Whether a line's times for the session's day agree with it. A line of sittings, each written from its start to its
// end, "14:00~16:00, 17:00~18:00", agrees when one of them is the session's; any other line, such as "15:00 → 16:00으로
// 변경", only when each is.
function lineAgrees(times: WrittenTime[], start: JudgedTime, end: JudgedTime | null): boolean {
  const own = (time: WrittenTime): boolean =>
    agrees(time.start, start.clock) && (time.end === null || agrees(time.end, end?.clock ?? null));
  return times.length > 0 && times.every((time) => time.end !== null)
    ? times.some((time) => own(time))
    : times.every((time) => own(time));
}

// Fails when a line for the session's day writes another start, or another end. A line with a start alone leaves the
// end to the line that has one, and "오후 2시" is 14:00.
export function timesConsistent(
  ownNumber: number,
  start: JudgedTime | null,
  end: JudgedTime | null,
  lines: string[],
  now: Date,
): boolean {
  if (start === null || start.clock === null) {
    return true;
  }
  return lines.every((_, index) => {
    const { line, from } = readLine(lines, index);
    const numbered = SESSION_LINE.exec(line);
    if ((numbered !== null && Number(numbered[1]) !== ownNumber) || isApplicationLabelled(line, lines, from)) {
      return true;
    }
    return lineAgrees(
      writtenTimes(line).filter(({ day }) => isWrittenDay(day, start, now)),
      start,
      end,
    );
  });
}
