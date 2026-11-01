/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CollectionService } from '../collection/collection.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { type Prisma, SessionAttachment } from '../generated/prisma/client.js';
import { PlaceDto } from '../places/dto/place.dto.js';
import { PlacesService } from '../places/places.service.js';
import { type CollectedPost, type CollectedSession, type EventsCollectedMessage } from './dto/events-collected.dto.js';
import { type StoredEventPostsDto, type StoredEventPostsQuestion } from './dto/stored-event-posts.dto.js';
import { namedPlace } from './named-place.js';

// The body's time line gave a time of day and the place names one Place. The header's date is often the application
// period.
function isReadByRules(session: CollectedSession, named: PlaceDto | null): boolean {
  return session.readFrom === 'body' && session.start?.hasTimeOfDay === true && named !== null;
}

// Every session is stored as a Draft: PublicationStepService publishes after the Collection's answer.
function toDraft(
  id: string,
  { title, description }: CollectedPost,
  { title: sessionTitle, start, end, place }: CollectedSession,
  named: PlaceDto | null,
): Prisma.GlobalEventCreateManyInput {
  return {
    id,
    title: sessionTitle ?? title,
    description,
    startsAt: start?.at ?? null,
    endsAt: end?.at ?? null,
    place,
    latitude: named?.latitude ?? null,
    longitude: named?.longitude ?? null,
  };
}

@Injectable()
export class CollectedPostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collection: CollectionService,
    private readonly places: PlacesService,
  ) {}

  // Stores each new post with its sessions. A post already stored is left as it is and its events too, in whatever
  // state, so that an Administrator's edits stay and a discarded post does not come back.
  // A Collection that stopped early is recorded as failed, with the posts it read, so that the two are stored together.
  async store({ source, collectedAt, failureReason, skippedPosts, posts }: EventsCollectedMessage): Promise<void> {
    const places = await this.places.list();
    await this.prisma.$transaction(async (tx) => {
      if (failureReason === null) {
        await this.collection.recordSuccess(tx, source, new Date(collectedAt));
      } else {
        await this.collection.recordFailure(source, new Date(collectedAt), failureReason, tx);
      }
      if (skippedPosts !== undefined) {
        await this.collection.recordSkippedPosts(tx, source, skippedPosts);
      }
      const created = await tx.sourcePost.createManyAndReturn({
        data: posts.map(({ key, address }) => ({ source, key, address })),
        skipDuplicates: true,
        select: { id: true, key: true },
      });
      const stored = new Map(created.map(({ id, key }) => [key, id]));
      const sessions = posts.flatMap((post) => {
        const sourcePostId = stored.get(post.key);
        return sourcePostId === undefined
          ? []
          : post.sessions.map((session) => ({
              post,
              session,
              sourcePostId,
              globalEventId: randomUUID(),
              named: namedPlace(session.place, places),
            }));
      });
      await tx.globalEvent.createMany({
        data: sessions.map(({ globalEventId, post, session, named }) => toDraft(globalEventId, post, session, named)),
      });
      await tx.sourcePostSession.createMany({
        data: sessions.map(({ sourcePostId, session, globalEventId, named }) => ({
          sourcePostId,
          number: session.number,
          globalEventId,
          attachedBy: SessionAttachment.own,
          readByRules: isReadByRules(session, named),
        })),
      });
    });
  }

  // In the order asked.
  async storedPosts({ source, keys }: StoredEventPostsQuestion): Promise<StoredEventPostsDto> {
    const stored = await this.prisma.sourcePost.findMany({
      where: { source, key: { in: keys } },
      select: { key: true },
    });
    const storedKeys = new Set(stored.map(({ key }) => key));
    return { keys: keys.filter((key) => storedKeys.has(key)) };
  }
}
