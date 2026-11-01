/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service.js';
import { GlobalEventState, Prisma, PublicationRoute, SessionAttachment } from '../generated/prisma/client.js';
import { conflict, notFound } from '../quests/refusals.js';
import { missingFor } from './dto/global-event.dto.js';
import {
  type AttachQueuedDto,
  type LinkedSessionDto,
  type QueueCandidateDto,
  type QueuedSessionDto,
} from './dto/same-event-queue.dto.js';
import { GlobalEventsService } from './global-events.service.js';
import { attachSession, candidatesLeft, DraftChangedError, namedPosts, sameEventCandidates } from './same-event.js';
import { withStepLock } from './step-lock.js';

const WITH_POST_AND_EVENT = {
  sourcePost: true,
  globalEvent: true,
} satisfies Prisma.SourcePostSessionInclude;

type QueuedSession = Prisma.SourcePostSessionGetPayload<{ include: typeof WITH_POST_AND_EVENT }>;

const IS_QUEUED = {
  heldFor: { not: null },
  attachedBy: SessionAttachment.own,
  globalEvent: { state: GlobalEventState.draft },
} satisfies Prisma.SourcePostSessionWhereInput;

const ownDraftSchema = z.object({
  title: z.string(),
  description: z.string(),
  place: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
});

const notQueued = (): Error =>
  conflict('POST_SESSION_NOT_QUEUED', 'This session no longer waits for an Administrator.');

const draftChanged = (version: number): Error =>
  conflict('GLOBAL_EVENT_CHANGED', 'The Global Event was changed since this version.', { version });

const orNull = (at: string | null): Date | null => (at === null ? null : new Date(at));

function toCandidateDto(event: {
  id: string;
  title: string;
  startsAt: Date | null;
  place: string | null;
  state: GlobalEventState;
}): QueueCandidateDto {
  const { id, title, startsAt, place, state } = event;
  return { id, title, startsAt: startsAt?.toISOString() ?? null, place, state };
}

// What an Administrator decides of the sessions the same-event step left, and of those it attached. Each action takes the
// step's lock, so that of two Administrators one acts and the other is refused, and neither crosses a Collection. A
// queued session's candidates are worked out when they are asked for, not stored: a candidate can go, or come, while it
// waits.
@Injectable()
export class SameEventQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly globalEvents: GlobalEventsService,
  ) {}

  async list(): Promise<QueuedSessionDto[]> {
    const sessions = await this.prisma.sourcePostSession.findMany({
      where: IS_QUEUED,
      orderBy: [{ sourcePost: { source: 'asc' } }, { sourcePost: { key: 'asc' } }, { number: 'asc' }],
      include: WITH_POST_AND_EVENT,
    });
    const listed: QueuedSessionDto[] = [];
    for (const session of sessions) {
      // oxlint-disable-next-line no-await-in-loop -- a short list for one Administrator
      listed.push(await this.toQueuedDto(session));
    }
    return listed;
  }

  // The event takes the session and its Draft goes. Nothing the apps list changes.
  attach(sessionId: string, { version, globalEventId }: AttachQueuedDto): Promise<void> {
    return withStepLock(this.prisma, async (tx) => {
      const session = await this.queued(tx, sessionId, version);
      const candidates = await this.candidatesOf(tx, session);
      if (!candidates.some(({ id }) => id === globalEventId)) {
        throw conflict('CANDIDATE_GONE', 'This event is no longer a candidate of the session.');
      }
      try {
        await attachSession(tx, session, globalEventId, null, undefined, SessionAttachment.administrator);
      } catch (error) {
        throw error instanceof DraftChangedError ? draftChanged(session.globalEvent.version) : error;
      }
    });
  }

  // Its Draft becomes an event of an Administrator's route, or is refused for what it still needs.
  async publishAsOwn(sessionId: string, version: number): Promise<void> {
    await withStepLock(this.prisma, async (tx) => {
      const { id, globalEvent } = await this.queued(tx, sessionId, version);
      const missing = missingFor(globalEvent);
      if (missing.length > 0) {
        throw conflict('GLOBAL_EVENT_INCOMPLETE', 'A published Global Event needs a start and a position.', {
          missing,
        });
      }
      // An edit on the event's own page takes no lock, so the write compares what was read.
      const { count } = await tx.globalEvent.updateMany({
        where: { id: globalEvent.id, version, state: GlobalEventState.draft },
        data: {
          state: GlobalEventState.published,
          publicationRoute: PublicationRoute.administrator,
          version: { increment: 1 },
        },
      });
      if (count === 0) {
        throw draftChanged(version);
      }
      await tx.sourcePostSession.update({ where: { id }, data: { heldFor: null } });
    });
    this.globalEvents.signalChanged();
  }

  // The session becomes its own Draft again, with a new id and what it held, and the event stays with its Quests and its
  // flag. The Draft's version is raised, as an Administrator's change is: a post so changed is never judged, and neither
  // the link rule nor the title rule takes it up. It waits for an Administrator, with `readByRules` off so that it is no
  // candidate for other posts.
  detach(sessionId: string): Promise<void> {
    return withStepLock(this.prisma, async (tx) => {
      const session = await tx.sourcePostSession.findUnique({ where: { id: sessionId } });
      if (session === null) {
        throw notFound('POST_SESSION_NOT_FOUND', 'No session has this id.');
      }
      if (session.attachedBy === SessionAttachment.own || session.ownDraft === null) {
        throw conflict('POST_SESSION_NOT_DETACHABLE', 'This session is not attached with what its Draft held.');
      }
      const { startsAt, endsAt, ...kept } = ownDraftSchema.parse(session.ownDraft);
      const draft = await tx.globalEvent.create({
        data: { ...kept, startsAt: orNull(startsAt), endsAt: orNull(endsAt), version: 2 },
      });
      await tx.sourcePostSession.update({
        where: { id: sessionId },
        data: {
          globalEventId: draft.id,
          attachedBy: SessionAttachment.own,
          reason: null,
          ownDraft: Prisma.DbNull,
          readByRules: false,
          heldFor: null,
        },
      });
    });
  }

  // The sessions linked to an event, its own first.
  async linkedSessions(globalEventId: string): Promise<LinkedSessionDto[]> {
    const sessions = await this.prisma.sourcePostSession.findMany({
      where: { globalEventId },
      orderBy: [
        { attachedBy: 'asc' },
        { sourcePost: { source: 'asc' } },
        { sourcePost: { key: 'asc' } },
        { number: 'asc' },
      ],
      include: { sourcePost: true },
    });
    return sessions.map(({ id, number, attachedBy, reason, ownDraft, sourcePost: { source, key, address } }) => ({
      sessionId: id,
      number,
      source,
      key,
      address,
      attachedBy,
      reason,
      detachable: attachedBy !== SessionAttachment.own && ownDraft !== null,
    }));
  }

  private async toQueuedDto(session: QueuedSession): Promise<QueuedSessionDto> {
    const { id, number, heldFor, sourcePost, sourcePostId, globalEvent } = session;
    if (heldFor === null) {
      throw notQueued();
    }
    const answer =
      globalEvent.startsAt === null
        ? null
        : await this.prisma.sameEventAnswer.findUnique({
            where: { sourcePostId_startsAt: { sourcePostId, startsAt: globalEvent.startsAt } },
          });
    return {
      sessionId: id,
      number,
      heldFor,
      reason: answer?.reason ?? null,
      source: sourcePost.source,
      key: sourcePost.key,
      address: sourcePost.address,
      draft: {
        id: globalEvent.id,
        version: globalEvent.version,
        title: globalEvent.title,
        startsAt: globalEvent.startsAt?.toISOString() ?? null,
        place: globalEvent.place,
        missing: missingFor(globalEvent),
      },
      candidates: await this.candidatesOf(this.prisma, session),
    };
  }

  private async queued(tx: Prisma.TransactionClient, sessionId: string, version: number): Promise<QueuedSession> {
    const session = await tx.sourcePostSession.findFirst({
      where: { id: sessionId, ...IS_QUEUED },
      include: WITH_POST_AND_EVENT,
    });
    if (session === null) {
      throw notQueued();
    }
    if (session.globalEvent.version !== version) {
      throw draftChanged(session.globalEvent.version);
    }
    return session;
  }

  // The events starting within a day that the refusing rules leave, and the events of the posts its body links, whatever
  // their times: that was the reason for a link that did not match one to one.
  private async candidatesOf(
    tx: Prisma.TransactionClient,
    { sourcePost, sourcePostId, globalEvent: { title, description, startsAt } }: QueuedSession,
  ): Promise<QueueCandidateDto[]> {
    const near =
      startsAt === null
        ? []
        : candidatesLeft({ title, startsAt }, await sameEventCandidates(tx, startsAt, sourcePostId));
    const named = namedPosts(sourcePost, description);
    const linked =
      named.length === 0
        ? []
        : await tx.globalEvent.findMany({
            where: {
              sessions: {
                some: { sourcePost: { OR: named } },
                none: { sourcePostId, attachedBy: SessionAttachment.own },
              },
            },
            orderBy: [{ startsAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
          });
    return [...new Map([...linked, ...near].map((event) => [event.id, toCandidateDto(event)])).values()];
  }
}
