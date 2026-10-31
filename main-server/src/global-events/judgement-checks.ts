/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { PlaceDto } from '../places/dto/place.dto.js';
import {
  type AnsweredSession,
  type JudgedSession,
  type JudgementAnswer,
  type JudgementCheck,
  JUDGEMENT_CHECKS,
} from './judgement-answer.js';
import { type JudgedPost } from './judgement-post.js';
import {
  isWrittenClock,
  isWrittenDay,
  type JudgedTime,
  readJudgedTime,
  type WrittenDay,
  writtenDays,
} from './judgement-time.js';
import { namedPlace } from './named-place.js';
import { type PostSourceSettings } from './post-sources.js';

// The server's checks of a Judgement (ADR 0008). The model decides nothing: a session is published only when every
// check passes, and a check that cannot tell fails.

const HOURS_24_MS = 24 * 60 * 60 * 1000;

// What marks a line as a period to apply in, not the event's own time.
const APPLICATION = /신청|접수|모집|등록|지원\s*기간|마감|응모|제출|원서|appl(?:y|ication)|registration|deadline/iu;

// A line this short holds a label for the next one, as "신청 기간" above its dates does.
const LABEL_LENGTH = 20;

const BUILDING_NUMBER_ALONE = /^\d+(?:-\d+)?동(?:\s*(?:지하\s*)?\d+층)?(?:\s*\d+(?:-\d+)?호)?$/u;

function normalised(text: string): string {
  return text.replaceAll(/[\s ]+/gu, ' ').trim();
}

// What is being checked: the post as the model read it, one line each, the Source's setting, the Places, and the time.
export interface CheckContext {
  post: JudgedPost;
  source: PostSourceSettings;
  places: PlaceDto[];
  now: Date;
  // The starts of the post's sessions the rules read. An answer covers the whole post, those included.
  readStarts: Date[];
}

function postLines({ title, text }: JudgedPost): string[] {
  return [title, ...text.split('\n')].map((line) => normalised(line)).filter((line) => line !== '');
}

// A quote the model broke over lines counts as each of its lines.
function quotedPieces(quotes: string[]): string[] {
  return quotes.flatMap((quote) => quote.split('\n')).map((piece) => normalised(piece));
}

function allLines({ lines }: AnsweredSession): string[] {
  return quotedPieces([...lines.start, ...lines.end, ...lines.place]);
}

function linesInPost(session: AnsweredSession, lines: string[]): boolean {
  const { start, end, place } = session;
  const { lines: quoted } = session;
  const answersEach =
    (start === null || quoted.start.length > 0) &&
    (end === null || quoted.end.length > 0) &&
    (place === null || quoted.place.length > 0);
  return answersEach && allLines(session).every((piece) => piece !== '' && lines.some((line) => line.includes(piece)));
}

function daysAmong(quotes: string[]): WrittenDay[] {
  return quotedPieces(quotes).flatMap((piece) => writtenDays(piece));
}

// The start's day is in its lines, and the end's in its own, or in the start's when it ends on the day it starts.
function dateAgrees(session: AnsweredSession, start: JudgedTime | null, end: JudgedTime | null, now: Date): boolean {
  if (start === null || (session.end !== null && end === null)) {
    return false;
  }
  const startDays = daysAmong(session.lines.start);
  if (!startDays.some((day) => isWrittenDay(day, start, now))) {
    return false;
  }
  if (end === null) {
    return true;
  }
  const endDays = daysAmong(session.lines.end);
  const sameDay = end.year === start.year && end.month === start.month && end.day === start.day;
  return sameDay || endDays.some((day) => isWrittenDay(day, end, now));
}

// A day written with a weekday has the weekday of the date the model gave. One without a weekday leaves nothing to
// compare.
function weekdayIn(quotes: string[], time: JudgedTime | null): boolean {
  return (
    time === null ||
    daysAmong(quotes)
      .filter(({ month, day }) => month === time.month && day === time.day)
      .every(({ weekday }) => weekday === null || weekday === time.weekday)
  );
}

function clockIn(quotes: string[], time: JudgedTime | null): boolean {
  const clock = time?.clock ?? null;
  return clock === null || quotedPieces(quotes).some((piece) => isWrittenClock(piece, clock));
}

// Reads the whole line a quote comes from and the short label above it, so that quoting only the dates of "신청 기간:
// 11/5 14:00" does not pass.
function notApplicationPeriod(session: AnsweredSession, lines: string[]): boolean {
  const pieces = quotedPieces([...session.lines.start, ...session.lines.end]);
  return lines.every((line, index) => {
    if (!pieces.some((piece) => piece !== '' && line.includes(piece))) {
      return true;
    }
    const above = lines[index - 1];
    const labelAbove = above !== undefined && above.length <= LABEL_LENGTH ? above : '';
    return !APPLICATION.test(line) && !APPLICATION.test(labelAbove);
  });
}

function startBeforeEnd(session: AnsweredSession, start: JudgedTime | null, end: JudgedTime | null): boolean {
  if (start === null || (session.end !== null && end === null)) {
    return false;
  }
  return end === null || start.at < end.at;
}

// A day alone is stored at 00:00 and would show as 00:00 on its card, and the site writes 00:00 where it has no time.
// An end given as a day alone would be stored at 00:00 of that day too.
function hasTimeOfDay(session: AnsweredSession, start: JudgedTime | null, end: JudgedTime | null): boolean {
  if (session.overPeriod) {
    return true;
  }
  const startClock = start?.clock ?? null;
  return startClock !== null && (startClock.hour !== 0 || startClock.minute !== 0) && end?.clock !== null;
}

// A session read as running over a period does not pass until ticket 07 lets one that quotes both its days through.
function length(session: AnsweredSession, start: JudgedTime | null, end: JudgedTime | null): boolean {
  if (session.overPeriod || start === null) {
    return false;
  }
  return end === null || end.at.getTime() - start.at.getTime() <= HOURS_24_MS;
}

function placeInLines({ place, lines }: AnsweredSession): boolean {
  if (place === null) {
    return false;
  }
  const written = normalised(place);
  return written !== '' && quotedPieces(lines.place).some((piece) => piece.includes(written));
}

// The one Place the session's place names. A building number alone says nothing of which campus, which the Source's
// setting answers; a place that names another campus is still refused by namedPlace.
export function matchedPlace(
  place: string | null,
  { buildingNumberIsGwanak }: PostSourceSettings,
  places: PlaceDto[],
): PlaceDto | null {
  if (place === null) {
    return null;
  }
  const written = normalised(place);
  const onGwanak = buildingNumberIsGwanak && BUILDING_NUMBER_ALONE.test(written);
  return namedPlace(onGwanak ? `서울대학교 ${written}` : written, places);
}

function checksOf(
  session: AnsweredSession,
  announcesEvent: boolean,
  isNew: boolean,
  named: PlaceDto | null,
  { post, now }: CheckContext,
): Record<JudgementCheck, boolean> {
  const lines = postLines(post);
  const start = session.start === null ? null : readJudgedTime(session.start);
  const end = session.end === null ? null : readJudgedTime(session.end);
  return {
    announcesEvent,
    linesInPost: linesInPost(session, lines),
    dateAgrees: dateAgrees(session, start, end, now),
    weekdayAgrees: weekdayIn(session.lines.start, start) && weekdayIn(session.lines.end, end),
    timeAgrees: clockIn(session.lines.start, start) && clockIn(session.lines.end, end),
    notApplicationPeriod: notApplicationPeriod(session, lines),
    startBeforeEnd: startBeforeEnd(session, start, end),
    hasTimeOfDay: hasTimeOfDay(session, start, end),
    length: length(session, start, end),
    placeInLines: placeInLines(session),
    placeMatches: named !== null,
    newSession: isNew,
  };
}

// The sessions of an answer with each check. A session is not new when the rules read its start, or when the answer
// already gave its start and place.
export function checkedSessions({ announcesEvent, sessions }: JudgementAnswer, context: CheckContext): JudgedSession[] {
  const seen = new Set<string>();
  return sessions.map((session) => {
    const at = session.start === null ? null : (readJudgedTime(session.start)?.at ?? null);
    const key = `${at?.toISOString() ?? session.start}|${normalised(session.place ?? '')}`;
    const isNew = !seen.has(key) && !context.readStarts.some((read) => read.getTime() === at?.getTime());
    seen.add(key);
    const named = matchedPlace(session.place, context.source, context.places);
    const passes = checksOf(session, announcesEvent, isNew, named, context);
    const results = JUDGEMENT_CHECKS.map((name) => ({ name, passed: passes[name] }));
    return {
      ...session,
      placeId: named?.id ?? null,
      checks: results,
      passed: results.every(({ passed }) => passed),
      globalEventId: null,
    };
  });
}

// Whether a Draft is the one the worker read this session into: it has the session's start, or its day alone.
function isDraftOf({ startsAt }: PlacedDraft, { start }: JudgedSession): boolean {
  const time = start === null ? null : readJudgedTime(start);
  if (time === null || startsAt === null) {
    return false;
  }
  const day = readJudgedTime(`${start?.slice(0, 10)}`)?.at.getTime();
  return startsAt.getTime() === time.at.getTime() || startsAt.getTime() === day;
}

interface PlacedDraft {
  id: string;
  startsAt: Date | null;
}

// Where each passing session goes, given the post's Drafts in session order, null being a new event: the Draft the worker
// read it into, else the post's only Draft, whose start may be only the header's date, else a Draft without a start. A
// Draft of several with another start keeps what the worker read. Failing sessions make no Draft, and a Draft stays for
// them: their own, or any other left. A session that is not new is no session left to look at.
export function placedSessions(sessions: JudgedSession[], drafts: PlacedDraft[]): Map<JudgedSession, string | null> {
  const passing = sessions.filter(({ passed }) => passed);
  const failing = sessions.filter(
    ({ passed, checks }) => !passed && checks.some(({ name, passed: ok }) => name === 'newSession' && ok),
  );
  const placed = new Map<JudgedSession, string | null>();
  const taken = new Set<string>();
  for (const session of passing) {
    const own = drafts.find((draft) => !taken.has(draft.id) && isDraftOf(draft, session));
    if (own !== undefined) {
      taken.add(own.id);
      placed.set(session, own.id);
    }
  }
  // Every Draft went to a passing session, and a failing one needs one left: the last of them becomes a new event.
  const last = [...placed.entries()].at(-1);
  if (failing.length > 0 && taken.size === drafts.length && last !== undefined) {
    placed.delete(last[0]);
    taken.delete(last[1] ?? '');
  }
  const free = drafts.filter(({ id }) => !taken.has(id));
  const unclaimed = free.filter((draft) => !failing.some((session) => isDraftOf(draft, session)));
  const spare = drafts.length === 1 ? [...unclaimed] : unclaimed.filter(({ startsAt }) => startsAt === null);
  // No other Draft is left to stay for the failing sessions.
  if (failing.length > 0 && free.length === spare.length) {
    spare.pop();
  }
  for (const session of passing) {
    if (!placed.has(session)) {
      placed.set(session, spare.shift()?.id ?? null);
    }
  }
  return placed;
}
