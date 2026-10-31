/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import {
  type GlobalEvent,
  GlobalEventState,
  type Prisma,
  PublicationRoute,
  SessionAttachment,
  SessionHold,
} from '../generated/prisma/client.js';
import { type PostWithOwnSessions } from './judgements.service.js';
import { attachSession, ownDraftOf, sameEventMatch, TITLE_RULE } from './same-event.js';

const emptyPost = { title: '', description: '' };

// What a Judgement read of a session, as it would publish it.
type JudgedValues = Pick<GlobalEvent, 'startsAt' | 'endsAt' | 'place' | 'latitude' | 'longitude'> & {
  state: typeof GlobalEventState.published;
  publicationRoute: typeof PublicationRoute.judgement;
};

type PostSession = PostWithOwnSessions['sessions'][number];

// Attaches, holds or publishes each session of the post that the rules read. An event an Administrator has changed or
// discarded meanwhile is left as it is. Gives whether it published one.
export async function settleReadByRules(
  tx: Prisma.TransactionClient,
  { id: sourcePostId, sessions }: PostWithOwnSessions,
  publishes: boolean,
): Promise<boolean> {
  let published = false;
  for (const session of sessions) {
    const { readByRules, heldFor, globalEvent } = session;
    const { id, title, startsAt, state, version } = globalEvent;
    if (readByRules && heldFor === null && startsAt !== null && state === GlobalEventState.draft && version === 1) {
      // oxlint-disable-next-line no-await-in-loop -- one transaction runs one statement at a time
      const match = await sameEventMatch(tx, { title, startsAt }, sourcePostId);
      if (match.kind === 'one') {
        // oxlint-disable-next-line no-await-in-loop -- as above
        await attachSession(tx, session, match.globalEventId, TITLE_RULE);
      } else if (match.kind === 'several') {
        // oxlint-disable-next-line no-await-in-loop -- as above
        await tx.sourcePostSession.update({
          where: { id: session.id },
          data: { heldFor: SessionHold.several_matches },
        });
      } else if (publishes) {
        // oxlint-disable-next-line no-await-in-loop -- as above
        const { count } = await tx.globalEvent.updateMany({
          where: { id, state: GlobalEventState.draft, version: 1 },
          data: { state: GlobalEventState.published, publicationRoute: PublicationRoute.rule },
        });
        published = published || count > 0;
      }
    }
  }
  return published;
}

// A session the post was not stored with: one more own session of the post.
async function createEvent(
  tx: Prisma.TransactionClient,
  { id: sourcePostId, sessions }: PostWithOwnSessions,
  number: number,
  values: JudgedValues,
): Promise<string> {
  const { title, description } = sessions[0]?.globalEvent ?? emptyPost;
  const { id } = await tx.globalEvent.create({
    data: {
      ...values,
      title,
      description,
      sessions: { create: { sourcePostId, number, attachedBy: SessionAttachment.own } },
    },
  });
  return id;
}

// Empty when an Administrator reached it first.
async function publishDraft(tx: Prisma.TransactionClient, id: string, values: JudgedValues): Promise<string | null> {
  const { count } = await tx.globalEvent.updateMany({
    where: { id, state: GlobalEventState.draft, version: 1 },
    data: values,
  });
  return count === 0 ? null : id;
}

// Keeps what the Judgement read on the session's Draft, a new one if it has none, for an Administrator to decide on.
async function holdJudged(
  tx: Prisma.TransactionClient,
  post: PostWithOwnSessions,
  draft: PostSession | undefined,
  number: number,
  { startsAt, endsAt, place, latitude, longitude }: JudgedValues,
): Promise<string> {
  const read = { startsAt, endsAt, place, latitude, longitude };
  const heldFor = SessionHold.several_matches;
  if (draft === undefined) {
    const { title, description } = post.sessions[0]?.globalEvent ?? emptyPost;
    const { id } = await tx.globalEvent.create({
      data: {
        ...read,
        title,
        description,
        sessions: { create: { sourcePostId: post.id, number, attachedBy: SessionAttachment.own, heldFor } },
      },
    });
    return id;
  }
  await tx.sourcePostSession.update({ where: { id: draft.id }, data: { heldFor } });
  await tx.globalEvent.update({ where: { id: draft.globalEventId }, data: read });
  return draft.globalEventId;
}

// Moves a session a Judgement passed to the event, keeping what the Judgement read.
async function attachJudged(
  tx: Prisma.TransactionClient,
  sourcePostId: string,
  draft: PostSession | undefined,
  number: number,
  globalEventId: string,
  ownDraft: ReturnType<typeof ownDraftOf>,
): Promise<void> {
  if (draft !== undefined) {
    await attachSession(tx, draft, globalEventId, TITLE_RULE, ownDraft);
    return;
  }
  await tx.sourcePostSession.create({
    data: { sourcePostId, number, globalEventId, attachedBy: SessionAttachment.rule, reason: TITLE_RULE, ownDraft },
  });
}

export interface JudgedSessionPlace {
  post: PostWithOwnSessions;
  // Its own Draft, or none when it needs a new event.
  draft: PostSession | undefined;
  // The number it takes when it has no Draft.
  number: number;
  values: JudgedValues;
  publishes: boolean;
}

// Attaches, holds or publishes a session a Judgement passed. Gives the event it now belongs to, if any, and whether that
// was a publication.
export async function settleJudgedSession(
  tx: Prisma.TransactionClient,
  { post, draft, number, values, publishes }: JudgedSessionPlace,
): Promise<{ globalEventId: string | null; published: boolean }> {
  const { title, description } = draft?.globalEvent ?? post.sessions[0]?.globalEvent ?? emptyPost;
  const { startsAt } = values;
  const match = startsAt === null ? null : await sameEventMatch(tx, { title, startsAt }, post.id);
  if (match?.kind === 'one') {
    const { globalEventId } = match;
    await attachJudged(tx, post.id, draft, number, globalEventId, ownDraftOf({ ...values, title, description }));
    return { globalEventId, published: false };
  }
  if (match?.kind === 'several') {
    return { globalEventId: await holdJudged(tx, post, draft, number, values), published: false };
  }
  if (!publishes) {
    return { globalEventId: null, published: false };
  }
  const globalEventId = await (draft === undefined
    ? createEvent(tx, post, number, values)
    : publishDraft(tx, draft.globalEventId, values));
  return { globalEventId, published: globalEventId !== null };
}
