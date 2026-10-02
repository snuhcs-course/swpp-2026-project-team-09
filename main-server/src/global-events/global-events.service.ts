import { Injectable } from '@nestjs/common';
import { BuildingDto } from '../buildings/dto/building.dto.js';
import { BuildingsService } from '../buildings/buildings.service.js';
import { CollectionService } from '../collection/collection.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { GlobalEventState, Prisma } from '../generated/prisma/client.js';
import { buildingOfPlace } from './building-of-place.js';
import { type CollectedEvent, type EventsCollectedMessage } from './dto/events-collected.dto.js';
import { type StoredEventPosts } from './dto/stored-event-posts.dto.js';

// A bound is a time with its offset, or a day when no time of day was read.
function hasTimeOfDay(bound: string | null): boolean {
  return bound?.includes('T') === true;
}

// A day is stored at its start in Asia/Seoul.
function moment(bound: string | null): Date | null {
  if (bound === null) {
    return null;
  }
  return new Date(hasTimeOfDay(bound) ? bound : `${bound}T00:00:00+09:00`);
}

// Published when the body's time line gave a time of day and the place names one building; a Draft otherwise. The
// header's date is often the application period.
function toGlobalEvent(event: CollectedEvent, buildings: BuildingDto[]): Prisma.GlobalEventCreateManyInput {
  const building = buildingOfPlace(event.place, buildings);
  const published = event.readFrom === 'body' && hasTimeOfDay(event.start) && building !== null;
  return {
    title: event.title,
    description: event.description,
    startsAt: moment(event.start),
    endsAt: moment(event.end),
    place: event.place,
    latitude: building?.latitude ?? null,
    longitude: building?.longitude ?? null,
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
    private readonly buildings: BuildingsService,
  ) {}

  // A post already stored is left as it is, in whatever state, so that an Administrator's edits stay and a discarded
  // post does not come back.
  async storeCollected({ source, collectedAt, events }: EventsCollectedMessage): Promise<void> {
    const buildings = await this.buildings.list();
    await this.prisma.$transaction(async (tx) => {
      await this.collection.recordSuccess(tx, source, new Date(collectedAt));
      await tx.globalEvent.createMany({
        data: events.map((event) => toGlobalEvent(event, buildings)),
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
