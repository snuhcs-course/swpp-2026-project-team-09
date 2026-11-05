/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type JudgedSession } from '../../src/global-events/judgement-answer.js';
import { checkedSessions, placedSessions } from '../../src/global-events/judgement-checks.js';
import { maskedPost } from '../../src/global-events/judgement-post.js';
import { periodEndAt, readJudgedTime } from '../../src/global-events/judgement-time.js';
import { POST_SOURCES } from '../../src/global-events/post-sources.js';
import { verdictOf } from '../../src/global-events/session-verdict.js';
import { type PlaceDto } from '../../src/places/dto/place.dto.js';
import { type StoredJudgement } from './model-calls.ts';
import { type ReadPost, type ReadSession } from './read-post.ts';

// What the rules and a Judgement read of one post, as the step would take it: the sessions each passed, which would be
// published with no comparison, those the step would compare though it would not publish them, and every value given,
// which C4 and C6 score.

export interface OutputSession {
  // The session it settles, or a new number when it needs a new event. Empty for one that settles nothing.
  number: number | null;
  title: string;
  // A day alone is stored at its start.
  start: Date | null;
  end: Date | null;
  place: string | null;
  placeId: string | null;
  overPeriod: boolean;
  passed: boolean;
  // Compared with the events that exist, as the step's verdict says: every session that passed, and some that did not.
  comparable: boolean;
  via: 'rules' | 'judgement';
  failedChecks: string[];
}

export interface PostReading {
  post: ReadPost;
  judgement: StoredJudgement | null;
  outputs: OutputSession[];
}

export function isJudged({ sessions }: ReadPost): boolean {
  return sessions.some(({ readByRules }) => !readByRules);
}

function ofRules({ number, title, startsAt, endsAt, place, placeId }: ReadSession): OutputSession {
  return {
    number,
    title,
    start: startsAt,
    end: endsAt,
    place,
    placeId,
    overPeriod: false,
    passed: true,
    comparable: true,
    via: 'rules',
    failedChecks: [],
  };
}

function judgedEnd({ end, overPeriod }: JudgedSession): Date | null {
  const judged = readJudgedTime(end ?? '');
  if (judged === null) {
    return null;
  }
  return overPeriod ? periodEndAt(judged) : judged.at;
}

// The number each session settles: that of its Draft, or the next free one, as the step makes a new event.
function numbersOf(sessions: JudgedSession[], post: ReadPost): Map<JudgedSession, number> {
  const drafts = post.sessions
    .filter(({ readByRules }) => !readByRules)
    .map(({ number, startsAt }) => ({ id: String(number), startsAt }));
  let next = Math.max(...post.sessions.map(({ number }) => number)) + 1;
  const numbers = new Map<JudgedSession, number>();
  for (const [session, draft] of placedSessions(sessions, drafts)) {
    if (draft === null) {
      numbers.set(session, next);
      next += 1;
    } else {
      numbers.set(session, Number(draft));
    }
  }
  return numbers;
}

function isNew({ checks }: JudgedSession): boolean {
  return checks.some(({ name, passed }) => name === 'newSession' && passed);
}

function ofJudgement(judgement: StoredJudgement, post: ReadPost, places: PlaceDto[]): OutputSession[] {
  if (judgement.answer === null) {
    return [];
  }
  const sessions = checkedSessions(judgement.answer, {
    post: maskedPost({ title: post.title, text: post.description }),
    source: POST_SOURCES[post.source],
    places,
    now: post.now,
    readStarts: post.sessions.flatMap(({ readByRules, startsAt }) =>
      readByRules && startsAt !== null ? [startsAt] : [],
    ),
  });
  const numbers = numbersOf(sessions, post);
  // One that is not new repeats a session already read, and never settles.
  return sessions
    .filter((session) => isNew(session))
    .map((session) => {
      const number = numbers.get(session) ?? null;
      return {
        number,
        title: post.sessions.find((each) => each.number === number)?.title ?? post.title,
        start: readJudgedTime(session.start ?? '')?.at ?? null,
        end: judgedEnd(session),
        place: session.place,
        placeId: session.placeId,
        overPeriod: session.overPeriod,
        passed: session.passed,
        comparable: verdictOf(session.checks).comparable,
        via: 'judgement' as const,
        failedChecks: session.checks.filter(({ passed }) => !passed).map(({ name }) => name),
      };
    });
}

export function readingOf(post: ReadPost, judgement: StoredJudgement | null, places: PlaceDto[]): PostReading {
  return {
    post,
    judgement,
    outputs: [
      ...post.sessions.filter(({ readByRules }) => readByRules).map((session) => ofRules(session)),
      ...(judgement === null ? [] : ofJudgement(judgement, post, places)),
    ],
  };
}
