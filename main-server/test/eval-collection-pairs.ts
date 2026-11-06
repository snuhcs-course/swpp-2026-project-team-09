/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type GoldPair } from '../eval/collection/gold.ts';
import { type ReadPost } from '../eval/collection/read-post.ts';
import { type OutputSession, type PostReading } from '../eval/collection/reading.ts';
import { type AskAboutPost } from '../eval/collection/same-event-step.ts';

// A world of a few posts for evaluation B's tests.

export const START = new Date('2026-11-02T14:00:00+09:00');

interface PostFixture {
  title?: string;
  description?: string;
  links?: string[];
  starts?: (Date | null)[];
  titles?: string[];
  // A Judgement read the sessions, and they failed only their place: compared, never published.
  placeFailed?: boolean;
}

function outputOf(number: number, title: string, start: Date, placeFailed: boolean): OutputSession {
  return {
    number,
    title,
    start,
    end: null,
    place: '장소',
    placeId: placeFailed ? null : 'p',
    overPeriod: false,
    passed: !placeFailed,
    comparable: true,
    via: placeFailed ? 'judgement' : 'rules',
    failedChecks: placeFailed ? ['placeMatches'] : [],
  };
}

export function reading(
  post: string,
  {
    title = '같은 행사',
    description = '본문',
    links = [],
    starts = [START],
    titles,
    placeFailed = false,
  }: PostFixture = {},
): PostReading {
  const key = post.replace(/^(?:snu|extra)-/u, '');
  const outputs = starts.flatMap((start, index) =>
    start === null ? [] : [outputOf(index + 1, titles?.[index] ?? title, start, placeFailed)],
  );
  const read: ReadPost = {
    post,
    source: post.startsWith('extra-') ? 'extra_snu' : 'snu_events',
    key,
    now: START,
    title,
    description,
    links,
    sessions: starts.map((start, index) => ({
      number: index + 1,
      title: titles?.[index] ?? title,
      startsAt: start,
      endsAt: null,
      place: '장소',
      placeId: 'p',
      readByRules: start !== null && !placeFailed,
    })),
  };
  return { post: read, judgement: null, outputs };
}

export function pair(id: string, a: string, b: string, sameEvent: boolean, chosenAs = 'different-title'): GoldPair {
  return { id, a: { post: a, session: null }, b: { post: b, session: null }, chosenAs, sameEvent };
}

export function worldOf(...readings: PostReading[]): Map<string, PostReading> {
  return new Map(readings.map((each) => [each.post.post, each]));
}

export const NEVER_ASKED: AskAboutPost = () => Promise.reject(new Error('The model was asked'));

export function answering(
  outcome: 'chosen' | 'none' | 'unsure' | 'failed',
  chosen: string | null = null,
): AskAboutPost {
  return (_post, { sessions }) =>
    Promise.resolve(
      sessions.map(({ startsAt }) => ({ startsAt, outcome, globalEventId: chosen, reason: null, failure: null })),
    );
}

export const STORED = 'extra-PGM1';
export const NEW = 'snu-100';
