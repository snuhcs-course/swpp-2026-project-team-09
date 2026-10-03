import { Injectable } from '@nestjs/common';
import { CollectionService } from '../collection/collection.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { GlobalEventState, Prisma } from '../generated/prisma/client.js';
import { PlaceDto } from '../places/dto/place.dto.js';
import { PlacesService } from '../places/places.service.js';
import { type CollectedEvent, type EventsCollectedMessage } from './dto/events-collected.dto.js';
import { type StoredEventPosts } from './dto/stored-event-posts.dto.js';
import { namedPlace } from './named-place.js';

// Published when the body's time line gave a time of day and the place names one Place; a Draft otherwise. The
// header's date is often the application period.
function toGlobalEvent(event: CollectedEvent, places: PlaceDto[]): Prisma.GlobalEventCreateManyInput {
  const named = namedPlace(event.place, places);
  const published = event.readFrom === 'body' && event.start?.hasTimeOfDay === true && named !== null;
  return {
    title: event.title,
    description: event.description,
    startsAt: event.start?.at ?? null,
    endsAt: event.end?.at ?? null,
    place: event.place,
    latitude: named?.latitude ?? null,
    longitude: named?.longitude ?? null,
    state: published ? GlobalEventState.published : GlobalEventState.draft,
    postNumber: event.postNumber,
    sourceUrl: event.sourceUrl,
  };
}

@Injectable()
export class GlobalEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collection: CollectionService,
    private readonly places: PlacesService,
  ) {}

  // A post already stored is left as it is, in whatever state, so that an Administrator's edits stay and a discarded
  // post does not come back.
  async storeCollected({ source, collectedAt, complete, events }: EventsCollectedMessage): Promise<void> {
    const places = await this.places.list();
    await this.prisma.$transaction(async (tx) => {
      if (complete) {
        await this.collection.recordSuccess(tx, source, new Date(collectedAt));
      }
      await tx.globalEvent.createMany({
        data: events.map((event) => toGlobalEvent(event, places)),
        skipDuplicates: true,
      });
    });
  }

  // In the order asked.
  async storedPosts(postNumbers: number[]): Promise<StoredEventPosts> {
    const stored = await this.prisma.globalEvent.findMany({
      where: { postNumber: { in: postNumbers } },
      select: { postNumber: true },
    });
    const storedNumbers = new Set(stored.map(({ postNumber }) => postNumber));
    return { postNumbers: postNumbers.filter((postNumber) => storedNumbers.has(postNumber)) };
  }
}
