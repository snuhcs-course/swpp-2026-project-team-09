/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

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
const ROUND = /(\d+)\s*회?차(?!원)/gu;
const IN_PERSON = /(?<!비)대면/u;
const REMOTE = /비대면/u;
// What a participant does there, not who it is for: 학생용 and 일반용 can be one event.
const ROLE = /헬퍼|디자이너|멘토(?!링)|멘티|튜터(?!링)|튜티|스태프/gu;

function roundsOf(title: string): string[] {
  return [...title.matchAll(ROUND)].map((match) => match[1]);
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
  if (sayApart(roundsOf(first.title), roundsOf(second.title))) {
    return 'different_rounds';
  }
  if (sayApart(modesOf(first.title), modesOf(second.title))) {
    return 'different_modes';
  }
  return sayApart(rolesOf(first.title), rolesOf(second.title)) ? 'different_roles' : null;
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
// posts already attached to the Draft follow. An Administrator's change to the Draft meanwhile fails the step over the
// post, so that the next Collection looks at it again.
export async function attachSession(
  tx: Prisma.TransactionClient,
  { id, globalEvent: draft }: PostSession,
  globalEventId: string,
  reason: string,
  ownDraft: OwnDraft = ownDraftOf(draft),
): Promise<void> {
  await tx.sourcePostSession.updateMany({ where: { globalEventId: draft.id }, data: { globalEventId } });
  await tx.sourcePostSession.update({
    where: { id },
    data: { attachedBy: SessionAttachment.rule, reason, ownDraft },
  });
  const { count } = await tx.globalEvent.deleteMany({
    where: { id: draft.id, state: GlobalEventState.draft, version: 1 },
  });
  if (count === 0) {
    throw new Error('An Administrator changed a Draft while it was being attached');
  }
}

// The link rule. When the post's body links stored posts, its sessions are attached to the linked post's events in the
// order of their numbers, whatever their times, or held when they do not match one to one. An event with another time
// stays as it is and is flagged, without raising its version. Gives whether the rule decided the post. A post whose
// event an Administrator changed or that has gone on already is left to the rest of the step.
export async function attachLinked(
  tx: Prisma.TransactionClient,
  post: PostWithOwnSessions & { links: string[] },
): Promise<boolean> {
  const { sessions } = post;
  const description = sessions[0]?.globalEvent.description ?? '';
  const isOwnPost = ({ source, key }: { source: Source; key: string }): boolean =>
    source === post.source && key === post.key;
  const named = linkedPosts([description, ...post.links].join('\n')).filter((linked) => !isOwnPost(linked));
  const areDrafts = sessions.every(({ globalEvent: { state } }) => state === GlobalEventState.draft);
  if (named.length === 0 || !areDrafts || isChangedByAdministrator(post)) {
    return false;
  }
  const ownEvents = new Set(sessions.map(({ globalEventId }) => globalEventId));
  const stored = await tx.sourcePost.findMany({
    where: { OR: named },
    orderBy: [{ source: 'asc' }, { key: 'asc' }],
    include: { sessions: { orderBy: { number: 'asc' }, include: { globalEvent: true } } },
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
  for (const [index, session] of sessions.entries()) {
    const { globalEvent: target } = only.sessions[index];
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
  return true;
}

// The events a session may be the same as, and how it matches them: those of any Source starting within one day, but for
// its post's own, in any state since a cancelled or discarded event must not come back through another post. A Draft
// must have a time someone read, or its start may be only an application period and attaching to it could hide the post
// for good: one an Administrator made, or one the rules read whose post has been through the step, so that of two new
// posts the first stays and the second comes to it.
export async function sameEventMatch(
  tx: Prisma.TransactionClient,
  session: ComparedSession,
  sourcePostId: string,
): Promise<SameEventMatch> {
  const { startsAt } = session;
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
    select: { id: true, title: true, startsAt: true },
  });
  return matchAmong(
    session,
    candidates.flatMap(({ id, title, startsAt: start }) => (start === null ? [] : [{ id, title, startsAt: start }])),
  );
}
