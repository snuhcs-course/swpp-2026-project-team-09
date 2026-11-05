/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import {
  type GlobalEvent,
  GlobalEventState,
  type Prisma,
  PublicationRoute,
  SessionAttachment,
  type SessionHold,
} from '../generated/prisma/client.js';
import { type PlaceDto } from '../places/dto/place.dto.js';
import { type JudgedSession } from './judgement-answer.js';
import { periodEndAt, readJudgedTime } from './judgement-time.js';
import { type PostWithOwnSessions } from './judgements.service.js';
import { attachSession, type OwnDraft, ownDraftOf, type PostSession, startsDiffer } from './same-event.js';
import { type Compared, compared, OWN, type StepSwitches } from './session-comparison.js';
import { type SessionVerdict } from './session-verdict.js';

const EMPTY_POST = { title: '', description: '' };

// What a Draft holds of a session's time and place.
export type DraftValues = Pick<GlobalEvent, 'startsAt' | 'endsAt' | 'place' | 'latitude' | 'longitude'>;

// What a Judgement read of a session, as it would publish it.
export type JudgedValues = DraftValues & {
  state: typeof GlobalEventState.published;
  publicationRoute: typeof PublicationRoute.judgement;
};

function judgedTimes({ start, end, overPeriod }: JudgedSession): Pick<DraftValues, 'startsAt' | 'endsAt'> {
  const judgedEnd = readJudgedTime(end ?? '');
  return {
    startsAt: readJudgedTime(start ?? '')?.at ?? null,
    endsAt: judgedEnd !== null && overPeriod ? periodEndAt(judgedEnd) : (judgedEnd?.at ?? null),
  };
}

export function publishedValues(session: JudgedSession, { latitude, longitude }: PlaceDto): JudgedValues {
  return {
    ...judgedTimes(session),
    place: session.place,
    latitude,
    longitude,
    state: GlobalEventState.published,
    publicationRoute: PublicationRoute.judgement,
  };
}

// What a Judgement read of a session it does not publish, over what its Draft holds: the time, when the checks of the
// time pass or the session is compared, and the place, when the checks of the place pass.
export function draftValues(
  session: JudgedSession,
  { comparable, timeRead, placeRead }: SessionVerdict,
  place: PlaceDto | undefined,
  draft: DraftValues | undefined,
): DraftValues {
  const { startsAt, endsAt } = judgedTimes(session);
  const held = draft ?? { startsAt: null, endsAt: null, place: null, latitude: null, longitude: null };
  const time = comparable || timeRead ? { startsAt, endsAt } : { startsAt: held.startsAt, endsAt: held.endsAt };
  const placed =
    placeRead && place !== undefined
      ? { place: session.place, latitude: place.latitude, longitude: place.longitude }
      : { place: held.place, latitude: held.latitude, longitude: held.longitude };
  return { ...time, ...placed };
}

// A session the rules read that the step has yet to compare.
export function awaitsComparison({ readByRules, heldFor, globalEvent }: PostSession): boolean {
  const { startsAt, state, version } = globalEvent;
  return readByRules && heldFor === null && startsAt !== null && state === GlobalEventState.draft && version === 1;
}

// An event with another time stays as it is and is flagged, without raising its version.
async function flagIfTimesDiffer(
  tx: Prisma.TransactionClient,
  { globalEventId, target }: Extract<Compared, { kind: 'attach' }>,
  startsAt: Date,
): Promise<void> {
  if (startsDiffer(startsAt, target)) {
    await tx.globalEvent.update({ where: { id: globalEventId }, data: { needsAdministrator: true } });
  }
}

// Gives whether it published the session.
async function settleOneReadByRules(
  tx: Prisma.TransactionClient,
  session: PostSession,
  startsAt: Date,
  switches: StepSwitches,
): Promise<boolean> {
  const { id, title } = session.globalEvent;
  const decision = await compared(tx, { title, startsAt }, session.sourcePostId, switches);
  if (decision.kind === 'attach') {
    if (session.timeStated) {
      await flagIfTimesDiffer(tx, decision, startsAt);
    }
    const { globalEventId, reason, attachedBy } = decision;
    await attachSession(tx, session, globalEventId, reason, undefined, attachedBy);
    return false;
  }
  if (decision.kind === 'hold') {
    await tx.sourcePostSession.update({ where: { id: session.id }, data: { heldFor: decision.heldFor } });
    return false;
  }
  if (!switches.publishes) {
    return false;
  }
  const { count } = await tx.globalEvent.updateMany({
    where: { id, state: GlobalEventState.draft, version: 1 },
    data: { state: GlobalEventState.published, publicationRoute: PublicationRoute.rule },
  });
  return count > 0;
}

// Attaches, holds or publishes each session of the post that the rules read. An event an Administrator has changed or
// discarded meanwhile is left as it is. Gives whether it published one.
export async function settleReadByRules(
  tx: Prisma.TransactionClient,
  { sessions }: PostWithOwnSessions,
  switches: StepSwitches,
): Promise<boolean> {
  let published = false;
  for (const session of sessions) {
    const { startsAt } = session.globalEvent;
    if (awaitsComparison(session) && startsAt !== null) {
      // oxlint-disable-next-line no-await-in-loop -- one transaction runs one statement at a time
      published = (await settleOneReadByRules(tx, session, startsAt, switches)) || published;
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
  const { title, description } = sessions[0]?.globalEvent ?? EMPTY_POST;
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

// A new Draft, one more own session of the post, with what a Judgement read.
export async function createDraft(
  tx: Prisma.TransactionClient,
  post: PostWithOwnSessions,
  number: number,
  { startsAt, endsAt, place, latitude, longitude }: DraftValues,
  heldFor: SessionHold | null = null,
): Promise<string> {
  const { title, description } = post.sessions[0]?.globalEvent ?? EMPTY_POST;
  const { id } = await tx.globalEvent.create({
    data: {
      startsAt,
      endsAt,
      place,
      latitude,
      longitude,
      title,
      description,
      sessions: { create: { sourcePostId: post.id, number, attachedBy: SessionAttachment.own, heldFor } },
    },
  });
  return id;
}

// Keeps what the Judgement read on the session's Draft, a new one if it has none, for an Administrator to decide on.
async function holdJudged(
  tx: Prisma.TransactionClient,
  post: PostWithOwnSessions,
  draft: PostSession | undefined,
  number: number,
  values: DraftValues,
  heldFor: SessionHold,
): Promise<string> {
  if (draft === undefined) {
    return createDraft(tx, post, number, values, heldFor);
  }
  const { startsAt, endsAt, place, latitude, longitude } = values;
  await tx.sourcePostSession.update({ where: { id: draft.id }, data: { heldFor } });
  await tx.globalEvent.update({
    where: { id: draft.globalEventId },
    data: { startsAt, endsAt, place, latitude, longitude },
  });
  return draft.globalEventId;
}

// Moves a session a Judgement passed to the event, keeping what the Judgement read.
async function attachJudged(
  tx: Prisma.TransactionClient,
  sourcePostId: string,
  draft: PostSession | undefined,
  number: number,
  { globalEventId, reason, attachedBy }: Extract<Compared, { kind: 'attach' }>,
  ownDraft: OwnDraft,
): Promise<void> {
  if (draft !== undefined) {
    await attachSession(tx, draft, globalEventId, reason, ownDraft, attachedBy);
    return;
  }
  await tx.sourcePostSession.create({
    data: { sourcePostId, number, globalEventId, attachedBy, reason, ownDraft },
  });
}

export interface SessionToSettle {
  post: PostWithOwnSessions;
  // Its own Draft, or none when it needs a new event.
  draft: PostSession | undefined;
  // The number it takes when it has no Draft.
  number: number;
  values: JudgedValues;
  switches: StepSwitches;
}

// Attaches, holds or publishes a session a Judgement passed. Gives the event it now belongs to, if any, and whether that
// was a publication.
export async function settleJudgedSession(
  tx: Prisma.TransactionClient,
  { post, draft, number, values, switches }: SessionToSettle,
): Promise<{ globalEventId: string | null; published: boolean }> {
  const { title, description } = draft?.globalEvent ?? post.sessions[0]?.globalEvent ?? EMPTY_POST;
  const { startsAt } = values;
  const decision = startsAt === null ? OWN : await compared(tx, { title, startsAt }, post.id, switches);
  if (decision.kind === 'attach' && startsAt !== null) {
    await flagIfTimesDiffer(tx, decision, startsAt);
    await attachJudged(tx, post.id, draft, number, decision, ownDraftOf({ ...values, title, description }));
    return { globalEventId: decision.globalEventId, published: false };
  }
  if (decision.kind === 'hold') {
    const globalEventId = await holdJudged(tx, post, draft, number, values, decision.heldFor);
    return { globalEventId, published: false };
  }
  if (!switches.publishes) {
    return { globalEventId: null, published: false };
  }
  const globalEventId = await (draft === undefined
    ? createEvent(tx, post, number, values)
    : publishDraft(tx, draft.globalEventId, values));
  return { globalEventId, published: globalEventId !== null };
}

// Fills the session's Draft with what was read, a new one if it has none. A Draft an Administrator reached first is left.
async function fillDraft(
  tx: Prisma.TransactionClient,
  post: PostWithOwnSessions,
  draft: PostSession | undefined,
  number: number,
  values: DraftValues,
): Promise<string> {
  if (draft === undefined) {
    return createDraft(tx, post, number, values);
  }
  await tx.globalEvent.updateMany({
    where: { id: draft.globalEventId, state: GlobalEventState.draft, version: 1 },
    data: values,
  });
  return draft.globalEventId;
}

export interface UnpublishedToSettle extends Omit<SessionToSettle, 'values'> {
  values: DraftValues;
  // Whether it is compared with the events that exist, or only fills its Draft.
  comparable: boolean;
}

// Attaches or holds a session a Judgement read but may not publish, or keeps it in its Draft with what was read. Gives the
// event it now belongs to.
export async function settleUnpublishedSession(
  tx: Prisma.TransactionClient,
  { post, draft, number, values, switches, comparable }: UnpublishedToSettle,
): Promise<string> {
  const { title, description } = draft?.globalEvent ?? post.sessions[0]?.globalEvent ?? EMPTY_POST;
  const { startsAt } = values;
  const decision =
    !comparable || startsAt === null ? OWN : await compared(tx, { title, startsAt }, post.id, switches, false);
  if (decision.kind === 'attach') {
    await attachJudged(tx, post.id, draft, number, decision, ownDraftOf({ ...values, title, description }));
    return decision.globalEventId;
  }
  if (decision.kind === 'hold') {
    return holdJudged(tx, post, draft, number, values, decision.heldFor);
  }
  return fillDraft(tx, post, draft, number, values);
}
