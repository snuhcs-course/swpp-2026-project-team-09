/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import {
  appliedChoice,
  type CandidateEvent,
  type SameEventQuestion,
  type SessionChoice,
  type SessionToCompare,
} from '../../src/global-events/same-event-choice.js';
import {
  candidatesLeft,
  type ComparedSession,
  matchAmong,
  namedPosts,
  normalisedTitle,
  refusalOf,
} from '../../src/global-events/same-event.js';
import { GlobalEventState, SessionHold } from '../../src/generated/prisma/client.js';
import { type PostReading } from './reading.ts';

// The same-event step over one new post with no database (metrics document, 2 B), in the order of the step and from the
// functions it uses: the link rule, the refusing rules, the title rule, then the AI's choice. Nothing it decides stays:
// each post starts from the world as the set gives it.

export type StepMode = 'naive' | 'rules' | 'ai';

export const NAIVE_SIMILARITY = 0.5;

const A_DAY = 24 * 60 * 60 * 1000;

export type Attachment = 'link' | 'title' | 'similar' | 'ai';

export type SessionFate =
  | { number: number; kind: 'own'; candidates: string[] }
  | { number: number; kind: 'held'; heldFor: SessionHold; candidates: string[] }
  | { number: number; kind: 'attached'; to: string; by: Attachment; candidates: string[] };

export function sessionId(post: string, number: number): string {
  return `${post}#${number}`;
}

// A session the step can compare: the rules or a Judgement passed it, so it has a start and would be published.
export interface ComparableSession extends ComparedSession {
  number: number;
  place: string | null;
}

export function comparableSessions({ outputs }: PostReading): ComparableSession[] {
  return outputs.flatMap(({ passed, number, start, title, place }) =>
    passed && number !== null && start !== null ? [{ number, title, startsAt: start, place }] : [],
  );
}

// A post before this one that the set pairs with it, and those of its sessions the pair is about, or all.
export interface Partner {
  reading: PostReading;
  sessions: number[] | null;
}

export interface NewPost {
  reading: PostReading;
  partners: Partner[];
  // The sessions of the post its pairs are about, or all of them when a pair says none.
  sessions: number[] | null;
}

function candidateOf(partner: PostReading, session: ComparableSession): CandidateEvent {
  return {
    id: sessionId(partner.post.post, session.number),
    title: session.title,
    description: partner.post.description,
    startsAt: session.startsAt,
    place: session.place,
    state: GlobalEventState.published,
  };
}

function isIn(scope: number[] | null, number: number): boolean {
  return scope === null || scope.includes(number);
}

// The sessions of the partners within a day of the session's start, each once.
function candidatesOf({ partners }: NewPost, { startsAt }: ComparableSession): CandidateEvent[] {
  const events = new Map<string, CandidateEvent>();
  for (const { reading, sessions } of partners) {
    for (const session of comparableSessions(reading)) {
      if (isIn(sessions, session.number) && Math.abs(session.startsAt.getTime() - startsAt.getTime()) <= A_DAY) {
        const event = candidateOf(reading, session);
        events.set(event.id, event);
      }
    }
  }
  return [...events.values()];
}

function pairsOfLetters(title: string): string[] {
  const letters = Array.from(normalisedTitle(title));
  return letters.slice(0, -1).map((letter, index) => `${letter}${letters[index + 1] ?? ''}`);
}

// The Dice coefficient of the pairs of letters of two normalised titles, each pair counted as often as it comes.
export function titleSimilarity(first: string, second: string): number {
  const [left, right] = [pairsOfLetters(first), pairsOfLetters(second)];
  if (left.length === 0 || right.length === 0) {
    return normalisedTitle(first) === normalisedTitle(second) ? 1 : 0;
  }
  const rest = [...right];
  let shared = 0;
  for (const pair of left) {
    const at = rest.indexOf(pair);
    if (at !== -1) {
      rest.splice(at, 1);
      shared += 1;
    }
  }
  return (2 * shared) / (left.length + right.length);
}

// The first official run of evaluation B: equal starts with title similarity, and nothing else. Of several, the closest.
function naiveFate(session: ComparableSession, events: CandidateEvent[]): SessionFate {
  const candidates = events.map(({ id }) => id);
  const [closest] = events
    .filter(({ startsAt }) => startsAt.getTime() === session.startsAt.getTime())
    .map(({ id, title }) => ({ id, similarity: titleSimilarity(session.title, title) }))
    .filter(({ similarity }) => similarity >= NAIVE_SIMILARITY)
    .toSorted((one, other) => other.similarity - one.similarity);
  return closest === undefined
    ? { number: session.number, kind: 'own', candidates }
    : { number: session.number, kind: 'attached', to: closest.id, by: 'similar', candidates };
}

// A stored post's sessions as attachLinked counts them: those the worker sent, and those a Judgement added.
function storedNumbers(reading: PostReading): number[] {
  const parsed = reading.post.sessions.map(({ number }) => number);
  const judged = comparableSessions(reading).map(({ number }) => number);
  return [...new Set([...parsed, ...judged])].toSorted((one, other) => one - other);
}

// The link rule, as attachLinked decides: empty when it leaves the post to the rest of the step. It reads the whole store,
// not the set, so every post the body names counts as stored: a Source's posts come in together. One named post outside
// the set has no sessions here to compare with, and is left to the rest of the step.
function linkFates({ reading: { post }, partners }: NewPost): SessionFate[] | null {
  const named = namedPosts(post, post.description);
  const linked = partners.filter(({ reading: { post: other } }) =>
    named.some(({ source, key }) => source === other.source && key === other.key),
  );
  const [only] = linked;
  if (named.length === 0 || (named.length === 1 && only === undefined)) {
    return null;
  }
  const allSessions = linked.flatMap(
    ({
      reading: {
        post: { post: name, sessions },
      },
    }) => sessions.map(({ number }) => sessionId(name, number)),
  );
  const numbers = only === undefined ? [] : storedNumbers(only.reading);
  if (only === undefined || named.length > 1 || numbers.length !== post.sessions.length) {
    return post.sessions.map(({ number }) => ({
      number,
      kind: 'held',
      heldFor: SessionHold.link_not_one_to_one,
      candidates: allSessions,
    }));
  }
  // A linked event no one read a time for takes nothing.
  const read = new Set(comparableSessions(only.reading).map(({ number }) => number));
  if (!numbers.every((number) => read.has(number))) {
    return null;
  }
  return post.sessions.map(({ number }, index) => ({
    number,
    kind: 'attached',
    to: sessionId(only.reading.post.post, numbers[index] ?? number),
    by: 'link',
    candidates: allSessions,
  }));
}

function questionOf(newPost: NewPost, sessions: ComparableSession[]): SameEventQuestion | null {
  const asked = new Map<number, SessionToCompare>();
  for (const session of sessions) {
    const at = session.startsAt.getTime();
    const same = asked.get(at);
    const events = candidatesOf(newPost, session);
    if (same === undefined) {
      const left = candidatesLeft(session, events);
      if (matchAmong(session, events).kind === 'none' && left.length > 0) {
        asked.set(at, { ...session, candidates: left });
      }
    } else {
      same.place = [same.place, session.place].filter((place) => place !== null).join(' / ');
      same.sharedStart = true;
    }
  }
  const { post } = newPost.reading;
  return asked.size === 0
    ? null
    : { post: { title: post.title, text: post.description }, source: post.source, sessions: [...asked.values()] };
}

export type AskAboutPost = (post: string, question: SameEventQuestion) => Promise<SessionChoice[]>;

interface Settled {
  // The events a session of the post went to, for one event cannot take two.
  taken: Set<string>;
  choices: SessionChoice[];
  question: SameEventQuestion | null;
}

// What the step does with a session it compares, as `compared` in session-settling.ts does.
function comparedFate(
  session: ComparableSession,
  events: CandidateEvent[],
  mode: StepMode,
  settled: Settled,
): SessionFate {
  const { number } = session;
  const candidates = events.map(({ id }) => id);
  const held = (heldFor: SessionHold): SessionFate => ({ number, kind: 'held', heldFor, candidates });
  const attached = (to: string, by: Attachment): SessionFate => {
    settled.taken.add(to);
    return { number, kind: 'attached', to, by, candidates };
  };
  const isAi = mode === 'ai';
  const match = matchAmong(session, events);
  if (match.kind === 'one') {
    return isAi && settled.taken.has(match.globalEventId)
      ? held(SessionHold.several_matches)
      : attached(match.globalEventId, 'title');
  }
  if (match.kind === 'several') {
    return held(SessionHold.several_matches);
  }
  const left = candidatesLeft(session, events);
  const asked = settled.question?.sessions.find(({ startsAt }) => startsAt.getTime() === session.startsAt.getTime());
  if (!isAi || (asked === undefined && left.length === 0)) {
    return { number, kind: 'own', candidates };
  }
  const choice = settled.choices.find(({ startsAt }) => startsAt.getTime() === session.startsAt.getTime());
  const applied = appliedChoice(
    choice === undefined || asked === undefined
      ? null
      : {
          outcome: choice.outcome,
          askedEventIds: asked.candidates.map(({ id }) => id),
          chosenEventId: choice.globalEventId,
          reason: choice.reason,
        },
    left.map(({ id }) => id),
  );
  if (applied.kind === 'own') {
    return { number, kind: 'own', candidates };
  }
  if (applied.kind === 'hold') {
    return held(applied.heldFor);
  }
  return settled.taken.has(applied.globalEventId)
    ? held(SessionHold.several_matches)
    : attached(applied.globalEventId, 'ai');
}

// What becomes of the sessions of a new post: those the link rule decided, and those with a time it can compare. A session
// with neither never reaches the step.
export async function stepOfPost(newPost: NewPost, mode: StepMode, ask: AskAboutPost): Promise<SessionFate[]> {
  const links = mode === 'naive' ? null : linkFates(newPost);
  if (links !== null) {
    return links;
  }
  const sessions = comparableSessions(newPost.reading).filter(({ number }) => isIn(newPost.sessions, number));
  if (mode === 'naive') {
    return sessions.map((session) => naiveFate(session, candidatesOf(newPost, session)));
  }
  const question = mode === 'ai' ? questionOf(newPost, sessions) : null;
  const settled: Settled = {
    taken: new Set(),
    question,
    choices: question === null ? [] : await ask(newPost.reading.post.post, question),
  };
  return sessions.map((session) => comparedFate(session, candidatesOf(newPost, session), mode, settled));
}

// Whether a rule refuses a pair, for the failure analysis.
export function isRefused(session: ComparedSession, candidate: ComparedSession): boolean {
  return refusalOf(session, candidate) !== null;
}
