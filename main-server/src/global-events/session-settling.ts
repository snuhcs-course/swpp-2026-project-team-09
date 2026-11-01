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
import { type PlaceDto } from '../places/dto/place.dto.js';
import { type JudgedSession } from './judgement-answer.js';
import { periodEndAt, readJudgedTime } from './judgement-time.js';
import { type PostWithOwnSessions } from './judgements.service.js';
import {
  attachSession,
  candidatesLeft,
  type ComparedSession,
  matchAmong,
  type OwnDraft,
  ownDraftOf,
  type PostSession,
  sameEventCandidates,
  startsDiffer,
  TITLE_RULE,
} from './same-event.js';
import { appliedChoice } from './same-event-choice.js';

const EMPTY_POST = { title: '', description: '' };

// What a Judgement read of a session, as it would publish it.
export type JudgedValues = Pick<GlobalEvent, 'startsAt' | 'endsAt' | 'place' | 'latitude' | 'longitude'> & {
  state: typeof GlobalEventState.published;
  publicationRoute: typeof PublicationRoute.judgement;
};

export function publishedValues(
  { start, end, place, overPeriod }: JudgedSession,
  { latitude, longitude }: PlaceDto,
): JudgedValues {
  const judgedEnd = readJudgedTime(end ?? '');
  return {
    startsAt: readJudgedTime(start ?? '')?.at ?? null,
    endsAt: judgedEnd !== null && overPeriod ? periodEndAt(judgedEnd) : (judgedEnd?.at ?? null),
    place,
    latitude,
    longitude,
    state: GlobalEventState.published,
    publicationRoute: PublicationRoute.judgement,
  };
}

// What the settings let the step do. Each may be off while the step still runs.
export interface StepSwitches {
  publishes: boolean;
  comparesTitles: boolean;
  choosesByAi: boolean;
}

// What the comparison says of a session. To attach, also how, and the start of the event it goes to.
type Compared =
  | { kind: 'own' }
  | { kind: 'hold'; heldFor: SessionHold }
  | {
      kind: 'attach';
      globalEventId: string;
      reason: string | null;
      attachedBy: SessionAttachment;
      target: Date;
    };

const OWN: Compared = { kind: 'own' };

// A session the rules read that the step has yet to compare.
export function awaitsComparison({ readByRules, heldFor, globalEvent }: PostSession): boolean {
  const { startsAt, state, version } = globalEvent;
  return readByRules && heldFor === null && startsAt !== null && state === GlobalEventState.draft && version === 1;
}

// The rules, then the answer the AI gave for the candidates they left. With both switches off nothing is looked at.
async function compared(
  tx: Prisma.TransactionClient,
  session: ComparedSession,
  sourcePostId: string,
  { comparesTitles, choosesByAi }: StepSwitches,
): Promise<Compared> {
  if (!comparesTitles && !choosesByAi) {
    return OWN;
  }
  const events = await sameEventCandidates(tx, session.startsAt, sourcePostId);
  const startOf = (id: string): Date => events.find((event) => event.id === id)?.startsAt ?? session.startsAt;
  const match = comparesTitles ? matchAmong(session, events) : { kind: 'none' as const };
  if (match.kind === 'one') {
    const { globalEventId } = match;
    const rule = SessionAttachment.rule;
    return { kind: 'attach', globalEventId, reason: TITLE_RULE, attachedBy: rule, target: startOf(globalEventId) };
  }
  if (match.kind === 'several') {
    return { kind: 'hold', heldFor: SessionHold.several_matches };
  }
  if (!choosesByAi) {
    return OWN;
  }
  const left = candidatesLeft(session, events);
  const stored = await tx.sameEventAnswer.findUnique({
    where: { sourcePostId_startsAt: { sourcePostId, startsAt: session.startsAt } },
  });
  // Asked about none and none has come. With an answer, a chosen event that has gone must not make the session its own.
  if (stored === null && left.length === 0) {
    return OWN;
  }
  const applied = appliedChoice(
    stored,
    left.map(({ id }) => id),
  );
  if (applied.kind !== 'attach') {
    return applied;
  }
  // One event cannot take two sessions of a post, whether asked in one call or two.
  const taken = await tx.sourcePostSession.count({ where: { sourcePostId, globalEventId: applied.globalEventId } });
  return taken > 0
    ? { kind: 'hold', heldFor: SessionHold.several_matches }
    : { ...applied, attachedBy: SessionAttachment.ai, target: startOf(applied.globalEventId) };
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
  { startsAt, endsAt, place, latitude, longitude }: JudgedValues,
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
  values: JudgedValues,
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
