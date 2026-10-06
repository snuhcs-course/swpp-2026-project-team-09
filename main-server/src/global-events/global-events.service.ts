import { Injectable } from '@nestjs/common';
import { CollectionService } from '../collection/collection.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { GlobalEvent, GlobalEventState, Prisma } from '../generated/prisma/client.js';
import { PlaceDto } from '../places/dto/place.dto.js';
import { PlacesService } from '../places/places.service.js';
import { notFound } from '../quests/refusals.js';
import { type CollectedEvent, type EventsCollectedMessage } from './dto/events-collected.dto.js';
import {
  GlobalEventDetailDto,
  ListedGlobalEventDto,
  type ListedState,
  PublishedGlobalEventDto,
  toGlobalEventDetailDto,
  toListedGlobalEventDto,
  toPublishedGlobalEventDto,
} from './dto/global-event.dto.js';
import { type StoredEventPostsDto } from './dto/stored-event-posts.dto.js';
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

// 00:00 in Asia/Seoul, which keeps +09:00 all year, of the day `now` falls on there.
function startOfSeoulDay(now: Date): Date {
  const day = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return new Date(`${day}T00:00:00+09:00`);
}

// An event has ended once its end has passed or, without an end, once the day of its start has passed in Asia/Seoul.
function notEnded(now: Date): Prisma.GlobalEventWhereInput {
  return { OR: [{ endsAt: { gt: now } }, { endsAt: null, startsAt: { gte: startOfSeoulDay(now) } }] };
}

const BY_START: Prisma.GlobalEventOrderByWithRelationInput[] = [
  { startsAt: { sort: 'asc', nulls: 'last' } },
  { title: 'asc' },
];

@Injectable()
export class GlobalEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collection: CollectionService,
    private readonly places: PlacesService,
    private readonly signals: SignalsService,
  ) {}

  // A post already stored is left as it is, in whatever state, so that an Administrator's edits stay and a discarded
  // post does not come back.
  // A Collection that stopped early is recorded as failed, with the posts it read, so that the two are stored together.
  async storeCollected({ source, collectedAt, failureReason, events }: EventsCollectedMessage): Promise<void> {
    const places = await this.places.list();
    const stored = await this.prisma.$transaction(async (tx) => {
      if (failureReason === null) {
        await this.collection.recordSuccess(tx, source, new Date(collectedAt));
      } else {
        await this.collection.recordFailure(source, new Date(collectedAt), failureReason, tx);
      }
      return tx.globalEvent.createManyAndReturn({
        data: events.map((event) => toGlobalEvent(event, places)),
        skipDuplicates: true,
        select: { state: true },
      });
    });
    if (stored.some(({ state }) => state === GlobalEventState.published)) {
      this.signalChanged();
    }
  }

  // Tells every connected app to fetch the published Global Events again. Call it once a change to them is committed.
  signalChanged(): void {
    this.signals.send('everyone', 'global-events-changed');
  }

  // In the order asked.
  async storedPosts(postNumbers: number[]): Promise<StoredEventPostsDto> {
    const stored = await this.prisma.globalEvent.findMany({
      where: { postNumber: { in: postNumbers } },
      select: { postNumber: true },
    });
    const storedNumbers = new Set(stored.map(({ postNumber }) => postNumber));
    return { postNumbers: postNumbers.filter((postNumber) => storedNumbers.has(postNumber)) };
  }

  async listPublished(): Promise<PublishedGlobalEventDto[]> {
    return (await this.findListed(GlobalEventState.published)).map((event) => toPublishedGlobalEventDto(event));
  }

  async listForAdministrators(state: ListedState): Promise<ListedGlobalEventDto[]> {
    return (await this.findListed(state)).map((event) => toListedGlobalEventDto(event));
  }

  // In any state.
  async read(id: string): Promise<GlobalEventDetailDto> {
    const event = await this.prisma.globalEvent.findUnique({ where: { id } });
    if (event === null) {
      throw notFound('GLOBAL_EVENT_NOT_FOUND', 'No Global Event has this id.');
    }
    return toGlobalEventDetailDto(event);
  }

  // Every Draft, or the published events that have not ended.
  private findListed(state: ListedState): Promise<GlobalEvent[]> {
    return this.prisma.globalEvent.findMany({
      where: state === GlobalEventState.published ? { state, ...notEnded(new Date()) } : { state },
      orderBy: BY_START,
    });
  }
}
