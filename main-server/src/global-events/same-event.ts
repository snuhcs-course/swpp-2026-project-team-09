/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type CandidateEvent } from './same-event-choice.js';
import {
  type GlobalEvent,
  GlobalEventState,
  type Prisma,
  SessionAttachment,
  SessionHold,
  type Source,
} from '../generated/prisma/client.js';
import { isChangedByAdministrator, type PostWithOwnSessions } from './judgements.service.js';
import { POST_SOURCE_NAMES, POST_SOURCES } from './post-sources.js';

const A_DAY = 24 * 60 * 60 * 1000;
const KOREA_OFFSET = 9 * 60 * 60 * 1000;

// The names of the rules, as a link's reason records them.
export const LINK_RULE = 'link';
export const TITLE_RULE = 'equal_title_and_start';

// The day of Asia/Seoul a time falls on, counted from the epoch.
function dayOf(at: Date): number {
  return Math.floor((at.getTime() + KOREA_OFFSET) / A_DAY);
}

// A day alone is stored at its start.
function hasTimeOfDay(at: Date): boolean {
  return (at.getTime() + KOREA_OFFSET) % A_DAY !== 0;
}

// Whether two starts cannot be one: the times, when both have one, or else the days.
export function startsDiffer(first: Date, second: Date): boolean {
  return hasTimeOfDay(first) && hasTimeOfDay(second)
    ? first.getTime() !== second.getTime()
    : dayOf(first) !== dayOf(second);
}

// What a Source writes around a title, "[중앙도서관] IEEE 세미나": a marker in it is read by the refusing rules, from the
// title as written.
const BRACKETED = /\[[^\]]*\]|\([^)]*\)|【[^】]*】|<[^>]*>/gu;

function withoutMarks(title: string): string {
  return title.replaceAll(/[^\p{L}\p{N}]+/gu, '');
}

// A title of only what is bracketed keeps it, so that it does not equal every other such title.
export function normalisedTitle(title: string): string {
  const folded = title.normalize('NFKC').toLowerCase();
  return withoutMarks(folded.replaceAll(BRACKETED, '')) || withoutMarks(folded);
}

// What two titles may say apart. Both must say it, and say nothing in common, for them to differ: "1차" against a title
// with no round says nothing. The body is not read, since it often speaks of the other kind ("비대면 참여 불가").
const ROUND = /(\d+(?:\s*[·・,]\s*\d+)*)\s*회?차(?!원|\s*산업)/gu;
const IN_PERSON = /(?<!비\s*)대면/u;
const REMOTE = /비\s*대면/u;
// What a participant does there, not who it is for: 학생용 and 일반용 can be one event.
const ROLE = /헬퍼|디자이너|멘토(?!링)|멘티|튜터(?!링)|튜티|스태프/gu;

function roundsOf(title: string): string[] {
  return [...title.matchAll(ROUND)].flatMap((match) => match[1].split(/\D+/u));
}

function modesOf(title: string): string[] {
  return [IN_PERSON.test(title) ? ['in_person'] : [], REMOTE.test(title) ? ['remote'] : []].flat();
}

function rolesOf(title: string): string[] {
  return title.match(ROLE) ?? [];
}

function sayApart(first: string[], second: string[]): boolean {
  return first.length > 0 && second.length > 0 && !first.some((marker) => second.includes(marker));
}

export interface ComparedSession {
  title: string;
  startsAt: Date;
}

export type Refusal = 'different_times' | 'different_rounds' | 'different_modes' | 'different_roles';

// Why two sessions cannot be one event, if a rule can tell. Another day is not such a reason, for the AI to look at.
export function refusalOf(first: ComparedSession, second: ComparedSession): Refusal | null {
  if (
    dayOf(first.startsAt) === dayOf(second.startsAt) &&
    hasTimeOfDay(first.startsAt) &&
    hasTimeOfDay(second.startsAt) &&
    first.startsAt.getTime() !== second.startsAt.getTime()
  ) {
    return 'different_times';
  }
  const [title, other] = [first.title.normalize('NFKC'), second.title.normalize('NFKC')];
  if (sayApart(roundsOf(title), roundsOf(other))) {
    return 'different_rounds';
  }
  if (sayApart(modesOf(title), modesOf(other))) {
    return 'different_modes';
  }
  return sayApart(rolesOf(title), rolesOf(other)) ? 'different_roles' : null;
}

export type SameEventMatch =
  { kind: 'none' } | { kind: 'one'; globalEventId: string } | { kind: 'several'; globalEventIds: string[] };

// Among the candidates of a session: those the refusing rules leave whose normalised title and start equal its own.
export function matchAmong(session: ComparedSession, candidates: (ComparedSession & { id: string })[]): SameEventMatch {
  const title = normalisedTitle(session.title);
  const ids = candidates
    .filter(
      (candidate) =>
        refusalOf(session, candidate) === null &&
        candidate.startsAt.getTime() === session.startsAt.getTime() &&
        normalisedTitle(candidate.title) === title,
    )
    .map(({ id }) => id);
  if (ids.length === 0) {
    return { kind: 'none' };
  }
  return ids.length === 1 ? { kind: 'one', globalEventId: ids[0] } : { kind: 'several', globalEventIds: ids };
}

// Those of the candidates the refusing rules leave.
export function candidatesLeft<T extends ComparedSession>(session: ComparedSession, candidates: T[]): T[] {
  return candidates.filter((candidate) => refusalOf(session, candidate) === null);
}

// The posts of any Source that a text names by their addresses, each once.
export function linkedPosts(text: string): { source: Source; key: string }[] {
  return POST_SOURCE_NAMES.flatMap((source) => {
    const { postKeyInLink } = POST_SOURCES[source];
    const named = text.matchAll(new RegExp(postKeyInLink.source, `${postKeyInLink.flags}g`));
    return [...new Set([...named].map((match) => match[1]))].map((key) => ({ source, key }));
  });
}

// What a session's own Draft held, kept on the session once it is attached to another event.
export type OwnDraft = Pick<GlobalEvent, 'title' | 'description' | 'place' | 'latitude' | 'longitude'> & {
  startsAt: string | null;
  endsAt: string | null;
};

export function ownDraftOf({
  title,
  description,
  place,
  latitude,
  longitude,
  startsAt,
  endsAt,
}: Pick<GlobalEvent, keyof OwnDraft | 'startsAt' | 'endsAt'>): OwnDraft {
  return {
    title,
    description,
    place,
    latitude,
    longitude,
    startsAt: startsAt?.toISOString() ?? null,
    endsAt: endsAt?.toISOString() ?? null,
  };
}

export type PostSession = PostWithOwnSessions['sessions'][number];

// Moves a session of its own Draft to another event, keeps what the Draft held, and removes the Draft. Sessions of other
// posts already attached to the Draft follow, and so does a flag they set on it. An Administrator's change to the Draft
// meanwhile fails the step over the post, so that the next Collection looks at it again.
export async function attachSession(
  tx: Prisma.TransactionClient,
  { id, globalEvent: draft }: PostSession,
  globalEventId: string,
  reason: string | null,
  ownDraft: OwnDraft = ownDraftOf(draft),
  attachedBy: SessionAttachment = SessionAttachment.rule,
): Promise<void> {
  // Read here: a post of the same message may have flagged the Draft since this session was read.
  const flagged = await tx.globalEvent.count({ where: { id: draft.id, needsAdministrator: true } });
  if (flagged > 0) {
    await tx.globalEvent.update({ where: { id: globalEventId }, data: { needsAdministrator: true } });
  }
  await tx.sourcePostSession.updateMany({ where: { globalEventId: draft.id }, data: { globalEventId } });
  await tx.sourcePostSession.update({
    where: { id },
    data: { attachedBy, reason, ownDraft, heldFor: null },
  });
  // An Administrator attaches a Draft they may have changed, having checked its version.
  const version = attachedBy === SessionAttachment.administrator ? draft.version : 1;
  const { count } = await tx.globalEvent.deleteMany({
    where: { id: draft.id, state: GlobalEventState.draft, version },
  });
  if (count === 0) {
    throw new Error('An Administrator changed a Draft while it was being attached');
  }
}

const WITH_LINKED_EVENTS = {
  sessions: {
    orderBy: { number: 'asc' },
    include: {
      globalEvent: { include: { sessions: { where: { attachedBy: SessionAttachment.own } } } },
    },
  },
} satisfies Prisma.SourcePostInclude;

type LinkedPost = Prisma.SourcePostGetPayload<{ include: typeof WITH_LINKED_EVENTS }>;
type LinkedSession = LinkedPost['sessions'][number];

// The other posts a post names, by its body and the links behind its words.
export function namedPosts(
  post: { source: Source; key: string; links: string[] },
  description: string,
): { source: Source; key: string }[] {
  return linkedPosts([description, ...post.links].join('\n')).filter(
    ({ source, key }) => source !== post.source || key !== post.key,
  );
}

// A Draft takes a linked post only with a time someone read: one an Administrator made, or one the rules read. Another
// may never be published, and the post would be hidden with it, though it could be published itself.
function takesLinkedPost({ state, sessions }: LinkedSession['globalEvent']): boolean {
  return state !== GlobalEventState.draft || sessions.length === 0 || sessions.some(({ readByRules }) => readByRules);
}

// Pairs the sessions by number. An event with another time stays as it is and is flagged, without raising its version.
async function attachInOrder(
  tx: Prisma.TransactionClient,
  sessions: PostSession[],
  linked: LinkedSession[],
): Promise<void> {
  for (const [index, session] of sessions.entries()) {
    const { globalEvent: target } = linked[index];
    const { startsAt } = session.globalEvent;
    if (
      session.timeStated &&
      startsAt !== null &&
      target.startsAt !== null &&
      startsDiffer(startsAt, target.startsAt)
    ) {
      // oxlint-disable-next-line no-await-in-loop -- one transaction runs one statement at a time
      await tx.globalEvent.update({ where: { id: target.id }, data: { needsAdministrator: true } });
    }
    // oxlint-disable-next-line no-await-in-loop -- as above
    await attachSession(tx, session, target.id, LINK_RULE);
  }
}

// The link rule. When the post's body links stored posts, its sessions are attached to the linked post's events in the
// order of their numbers, whatever their times, or held when they do not match one to one. Gives whether the rule
// decided the post. A post whose event an Administrator changed, that has gone on already, or whose linked event no one
// has read a time for is left to the rest of the step.
export async function attachLinked(
  tx: Prisma.TransactionClient,
  post: PostWithOwnSessions & { links: string[] },
): Promise<boolean> {
  const { sessions } = post;
  const named = namedPosts(post, sessions[0]?.globalEvent.description ?? '');
  const areDrafts = sessions.every(({ globalEvent: { state } }) => state === GlobalEventState.draft);
  if (named.length === 0 || !areDrafts || isChangedByAdministrator(post)) {
    return false;
  }
  const ownEvents = new Set(sessions.map(({ globalEventId }) => globalEventId));
  const stored = await tx.sourcePost.findMany({
    where: { OR: named },
    orderBy: [{ source: 'asc' }, { key: 'asc' }],
    include: WITH_LINKED_EVENTS,
  });
  // A post that was attached to this one and links it back has nothing to attach to.
  const linked = stored.filter((other) => !other.sessions.every(({ globalEventId }) => ownEvents.has(globalEventId)));
  if (linked.length === 0) {
    return false;
  }
  const [only, other] = linked;
  if (other !== undefined || only.sessions.length !== sessions.length) {
    await tx.sourcePostSession.updateMany({
      where: { id: { in: sessions.map(({ id }) => id) } },
      data: { heldFor: SessionHold.link_not_one_to_one },
    });
    return true;
  }
  if (!only.sessions.every(({ globalEvent }) => takesLinkedPost(globalEvent))) {
    return false;
  }
  await attachInOrder(tx, sessions, only.sessions);
  return true;
}

// The events a session may be the same as: those of any Source starting within one day, but for its post's own, in any
// state since a cancelled or discarded event must not come back through another post. A Draft must have a time someone
// read, or its start may be only an application period and attaching to it could hide the post for good: one an
// Administrator made, or one the rules read whose post has been through the step, so that of two new posts the first
// stays and the second comes to it.
export async function sameEventCandidates(
  tx: Prisma.TransactionClient,
  startsAt: Date,
  sourcePostId: string,
): Promise<CandidateEvent[]> {
  const candidates = await tx.globalEvent.findMany({
    where: {
      startsAt: { gte: new Date(startsAt.getTime() - A_DAY), lte: new Date(startsAt.getTime() + A_DAY) },
      sessions: { none: { sourcePostId, attachedBy: SessionAttachment.own } },
      OR: [
        { state: { not: GlobalEventState.draft } },
        { sessions: { none: {} } },
        {
          sessions: {
            some: {
              attachedBy: SessionAttachment.own,
              readByRules: true,
              sourcePost: { stepFinishedAt: { not: null } },
            },
          },
        },
      ],
    },
    orderBy: { id: 'asc' },
    select: { id: true, title: true, description: true, startsAt: true, place: true, state: true },
  });
  return candidates.flatMap(({ startsAt: start, ...candidate }) =>
    start === null ? [] : [{ ...candidate, startsAt: start }],
  );
}
