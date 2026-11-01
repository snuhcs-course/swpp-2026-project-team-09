/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { APPLICATION } from '../../src/global-events/judgement-checks.js';
import { isWrittenDay, readJudgedTime, writtenDays } from '../../src/global-events/judgement-time.js';
import { type GoldPost, type GoldSession } from './gold.ts';
import { isMalformedAnswer } from './model-calls.ts';
import { type OutputSession, type PostReading } from './reading.ts';

// Evaluation A's scores (metrics document, 2 A). How a blank in that document is read was settled by the P05 owner on
// 2026-11-01, and is in the ticket's comments.

export interface Rate {
  k: number;
  n: number;
}

export interface FieldScore {
  precision: Rate;
  recall: Rate;
  madeUp: Rate;
}

export interface ScoreA {
  c1: Rate;
  c2: Rate;
  // Those published decide the floor. Those a check stopped are for diagnosis.
  c3: { published: number; allGiven: number };
  c4: {
    // Empty when no model was asked.
    schema: Rate | null;
    failedCalls: number;
    start: FieldScore;
    end: FieldScore;
    place: FieldScore;
    announcesEvent: { precision: Rate; recall: Rate };
  };
  c5: number;
  c6: Rate;
  c7: number;
  rows: FailureRowA[];
}

export interface FailureRowA {
  id: string;
  session: number | null;
  failed: string;
  cause: string;
}

const A_DAY = 24 * 60 * 60 * 1000;
const KOREA_OFFSET = 9 * 60 * 60 * 1000;

function dayOf(at: Date): number {
  return Math.floor((at.getTime() + KOREA_OFFSET) / A_DAY);
}

function isDayAlone(at: Date): boolean {
  return (at.getTime() + KOREA_OFFSET) % A_DAY === 0;
}

function sameMoment(at: Date, label: string): boolean {
  return readJudgedTime(label)?.at.getTime() === at.getTime();
}

function hasClock(label: string): boolean {
  return readJudgedTime(label)?.clock !== null && readJudgedTime(label) !== null;
}

function sameDay(at: Date, label: string): boolean {
  const day = readJudgedTime(label);
  return day !== null && dayOf(at) === dayOf(day.at);
}

export function startIsRight({ start, overPeriod }: OutputSession, gold: GoldSession | undefined): boolean {
  if (start === null || gold === undefined || gold.start === 'none') {
    return false;
  }
  if (hasClock(gold.start)) {
    return sameMoment(start, gold.start);
  }
  return sameDay(start, gold.start) && (overPeriod || isDayAlone(start));
}

// An end the post does not give is made up. One left out of what the post gives only lowers C4's recall. A label of a day
// alone is compared by day for a period, and away from one a time of day is wrong.
export function endIsWrong({ end, overPeriod }: OutputSession, gold: GoldSession | undefined): boolean {
  if (end === null) {
    return false;
  }
  if (gold === undefined || gold.end === 'none') {
    return true;
  }
  if (hasClock(gold.end)) {
    return !sameMoment(end, gold.end);
  }
  return !sameDay(end, gold.end) || !(overPeriod || isDayAlone(end));
}

export function isPublishedWrong(output: OutputSession, gold: GoldSession | undefined): boolean {
  return !startIsRight(output, gold) || output.placeId !== (gold?.placeId ?? null) || endIsWrong(output, gold);
}

function takeInto(
  pairs: Map<OutputSession, GoldSession>,
  outputs: OutputSession[],
  golds: GoldSession[],
  matches: (output: OutputSession, gold: GoldSession) => boolean,
): void {
  const taken = new Set(pairs.values());
  for (const output of outputs.filter((each) => !pairs.has(each))) {
    const gold = golds.find((each) => !taken.has(each) && matches(output, each));
    if (gold !== undefined) {
      pairs.set(output, gold);
      taken.add(gold);
    }
  }
}

// Each output with the session of the answer it stands for: the same minute, then the same day, then what is left in
// order. Those that passed choose first, so that a failed repeat does not take a published session's answer.
export function aligned(outputs: OutputSession[], golds: GoldSession[]): Map<OutputSession, GoldSession> {
  const ordered = outputs.toSorted((one, other) => Number(other.passed) - Number(one.passed));
  const pairs = new Map<OutputSession, GoldSession>();
  takeInto(pairs, ordered, golds, ({ start }, { start: label }) => start !== null && sameMoment(start, label));
  takeInto(pairs, ordered, golds, ({ start }, { start: label }) => start !== null && sameDay(start, label));
  takeInto(pairs, ordered, golds, () => true);
  return pairs;
}

const rateOf = (k: number, n: number): Rate => ({ k, n });

interface FieldOf {
  given: (output: OutputSession) => boolean;
  right: (output: OutputSession, gold: GoldSession | undefined) => boolean;
  labelled: (gold: GoldSession) => boolean;
}

const FIELDS = {
  start: {
    given: ({ start }) => start !== null,
    right: startIsRight,
    labelled: ({ start }) => start !== 'none',
  },
  end: {
    given: ({ end }) => end !== null,
    right: (output, gold) => gold !== undefined && gold.end !== 'none' && !endIsWrong(output, gold),
    labelled: ({ end }) => end !== 'none',
  },
  place: {
    given: ({ placeId }) => placeId !== null,
    right: ({ placeId }, gold) => gold?.placeId === placeId,
    labelled: ({ placeId }) => placeId !== null,
  },
} as const satisfies Record<string, FieldOf>;

interface Scored {
  gold: GoldPost;
  reading: PostReading;
  pairs: Map<OutputSession, GoldSession>;
}

function fieldScore(scored: Scored[], field: FieldOf): FieldScore {
  const given = scored.flatMap(({ reading, pairs }) =>
    reading.outputs.filter((each) => field.given(each)).map((output) => ({ output, gold: pairs.get(output) })),
  );
  const labelled = scored.flatMap(({ gold, pairs }) =>
    gold.sessions.filter(field.labelled).map((each) => ({ gold: each, pairs })),
  );
  const found = labelled.filter(({ gold, pairs }) =>
    [...pairs].some(([output, each]) => each === gold && field.given(output) && field.right(output, gold)),
  );
  return {
    precision: rateOf(given.filter(({ output, gold }) => field.right(output, gold)).length, given.length),
    recall: rateOf(found.length, labelled.length),
    madeUp: rateOf(given.filter(({ gold }) => gold === undefined || !field.labelled(gold)).length, given.length),
  };
}

// Whether a day the output was published with stands on a line about applying: C7, which the labels do not name.
function isApplicationPeriod({ start }: OutputSession, { post }: PostReading): boolean {
  const time =
    start === null ? null : readJudgedTime(new Date(start.getTime() + KOREA_OFFSET).toISOString().slice(0, 10));
  if (time === null) {
    return false;
  }
  return [post.title, ...post.description.split('\n')].some(
    (line) => APPLICATION.test(line) && writtenDays(line).some((day) => isWrittenDay(day, time, post.now)),
  );
}

function causeOfFailed(output: OutputSession | undefined): string {
  if (output === undefined) {
    return '추출';
  }
  const failed = output.failedChecks;
  if (failed.includes('linesInPost')) {
    return '근거 줄';
  }
  return failed.includes('placeMatches') ? '캠퍼스 기본 가정' : '검사 규칙';
}

function rowsOf({ gold, reading, pairs }: Scored): FailureRowA[] {
  const byGold = new Map([...pairs].map(([output, session]) => [session, output]));
  const wrong = reading.outputs
    .filter(({ passed }) => passed)
    .filter((output) => isPublishedWrong(output, pairs.get(output)))
    .map((output) => ({
      id: gold.id,
      session: pairs.get(output)?.n ?? null,
      failed: '틀린 발행',
      cause: output.via === 'rules' ? '검사 규칙' : '추출',
    }));
  const missed = gold.sessions
    .filter(({ mayPublish }) => mayPublish)
    .flatMap((session) => {
      const output = byGold.get(session);
      if (output?.passed === true) {
        return [];
      }
      const checks = output?.failedChecks.join(', ') ?? reading.judgement?.failure ?? '답 없음';
      return [{ id: gold.id, session: session.n, failed: `미발행: ${checks}`, cause: causeOfFailed(output) }];
    });
  return [...wrong, ...missed];
}

function schemaOf(readings: PostReading[]): { schema: Rate | null; failedCalls: number } {
  const judgements = readings.flatMap(({ judgement }) => (judgement === null ? [] : [judgement]));
  if (judgements.length === 0) {
    return { schema: null, failedCalls: 0 };
  }
  const malformed = judgements.filter(({ failure }) => failure !== null && isMalformedAnswer(failure)).length;
  const answers = judgements.filter(({ answer }) => answer !== null).length;
  return {
    schema: rateOf(answers, answers + malformed),
    failedCalls: judgements.length - answers - malformed,
  };
}

function announced({ judgement, outputs }: PostReading): boolean {
  return judgement?.answer?.announcesEvent === true || outputs.some(({ via }) => via === 'rules');
}

function scoredPosts(golds: GoldPost[], readings: Map<string, PostReading>): Scored[] {
  return golds.map((gold) => {
    const reading = readings.get(gold.post);
    if (reading === undefined) {
      throw new Error(`${gold.id} has no reading`);
    }
    return { gold, reading, pairs: aligned(reading.outputs, gold.sessions) };
  });
}

function isWrongPlace({ output, gold }: { output: OutputSession; gold: GoldSession | undefined }): boolean {
  return output.placeId !== (gold?.placeId ?? null);
}

export function scoreA(golds: GoldPost[], readings: Map<string, PostReading>): ScoreA {
  const scored = scoredPosts(golds, readings);
  const published = scored.flatMap(({ reading, pairs }) =>
    reading.outputs.filter(({ passed }) => passed).map((output) => ({ output, reading, gold: pairs.get(output) })),
  );
  const wrong = published.filter(({ output, gold }) => isPublishedWrong(output, gold));
  const allGiven = scored.flatMap(({ reading, pairs }) =>
    reading.outputs.filter(({ placeId }) => placeId !== null).map((output) => ({ output, gold: pairs.get(output) })),
  );
  const mayPublish = scored.flatMap(({ gold }) => gold.sessions.filter((each) => each.mayPublish));
  const allGold = scored.flatMap(({ gold, pairs }) => gold.sessions.map((session) => ({ session, pairs })));
  const predicted = scored.filter(({ reading }) => announced(reading));
  const events = scored.filter(({ gold }) => gold.announcesEvent);
  return {
    c1: rateOf(
      published.filter(({ output, gold }) => gold?.mayPublish === true && !isPublishedWrong(output, gold)).length,
      mayPublish.length,
    ),
    c2: rateOf(wrong.length, published.length),
    c3: {
      published: published.filter((each) => isWrongPlace(each)).length,
      allGiven: allGiven.filter((each) => isWrongPlace(each)).length,
    },
    c4: {
      ...schemaOf(scored.map(({ reading }) => reading)),
      start: fieldScore(scored, FIELDS.start),
      end: fieldScore(scored, FIELDS.end),
      place: fieldScore(scored, FIELDS.place),
      announcesEvent: {
        precision: rateOf(predicted.filter(({ gold }) => gold.announcesEvent).length, predicted.length),
        recall: rateOf(events.filter(({ reading }) => announced(reading)).length, events.length),
      },
    },
    c5: scored.filter(({ gold, reading }) => !gold.announcesEvent && reading.outputs.some(({ passed }) => passed))
      .length,
    c6: rateOf(
      allGold.filter(({ session, pairs }) =>
        [...pairs].some(([output, each]) => each === session && output.overPeriod === session.overPeriod),
      ).length,
      allGold.length,
    ),
    c7: wrong.filter(({ output, reading, gold }) => !startIsRight(output, gold) && isApplicationPeriod(output, reading))
      .length,
    rows: scored.flatMap((each) => rowsOf(each)),
  };
}
