// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-04 to 2026-10-08, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #30 #39
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CollectionService } from '../collection/collection.service.js';
import { CampusBoundary } from '../common/campus-boundary.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { GlobalEvent, GlobalEventState, Prisma } from '../generated/prisma/client.js';
import { PlaceDto } from '../places/dto/place.dto.js';
import { PlacesService } from '../places/places.service.js';
import { QuestsService } from '../quests/quests.service.js';
import { conflict, notFound } from '../quests/refusals.js';
import { type CreateGlobalEventDto, type EditGlobalEventDto } from './dto/change-global-event.dto.js';
import { type CollectedEvent, type EventsCollectedMessage } from './dto/events-collected.dto.js';
import {
  GlobalEventDetailDto,
  ListedGlobalEventDto,
  type ListedState,
  missingFor,
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

// What an edit or a change of state writes besides the version.
type Change = Partial<
  Pick<GlobalEvent, 'title' | 'description' | 'startsAt' | 'endsAt' | 'place' | 'latitude' | 'longitude' | 'state'>
>;

const globalEventNotFound = (): NotFoundException => notFound('GLOBAL_EVENT_NOT_FOUND', 'No Global Event has this id.');

// Refuses a change from `version` to an event that does not exist, that is not in one of the states `from`, or whose
// stored version is another.
function refuseUnlessChangeable(
  stored: GlobalEvent | null,
  from: readonly GlobalEventState[],
  version: number,
): asserts stored is GlobalEvent {
  if (stored === null) {
    throw globalEventNotFound();
  }
  if (!from.includes(stored.state)) {
    throw conflict('GLOBAL_EVENT_STATE', `A Global Event that is ${stored.state} cannot be changed so.`, {
      state: stored.state,
    });
  }
  if (stored.version !== version) {
    throw conflict('GLOBAL_EVENT_CHANGED', 'The Global Event was changed since this version.', {
      version: stored.version,
    });
  }
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
    private readonly campusBoundary: CampusBoundary,
    private readonly quests: QuestsService,
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
      throw globalEventNotFound();
    }
    return toGlobalEventDetailDto(event);
  }

  async create(fields: CreateGlobalEventDto): Promise<GlobalEventDetailDto> {
    this.refuseOffCampus(fields);
    return toGlobalEventDetailDto(await this.prisma.globalEvent.create({ data: fields }));
  }

  // A Draft or a published event, which stays published.
  edit(id: string, { version, ...fields }: EditGlobalEventDto): Promise<GlobalEventDetailDto> {
    this.refuseOffCampus(fields);
    return this.change(id, version, [GlobalEventState.draft, GlobalEventState.published], fields);
  }

  publish(id: string, version: number): Promise<GlobalEventDetailDto> {
    return this.change(id, version, [GlobalEventState.draft], { state: GlobalEventState.published });
  }

  discard(id: string, version: number): Promise<GlobalEventDetailDto> {
    return this.change(id, version, [GlobalEventState.draft], { state: GlobalEventState.discarded });
  }

  cancel(id: string, version: number): Promise<GlobalEventDetailDto> {
    return this.change(id, version, [GlobalEventState.published], { state: GlobalEventState.cancelled });
  }

  // Writes the change to an event in one of the states `from` and raises its version, in one statement that also
  // compares the version, so that of two changes from the same version one is applied and the other refused. Every
  // write raises the version, so the fields checked are those written over. A change Users see is announced once
  // written: to every app, and to the Holders of the event's Quests when the event was published.
  private async change(
    id: string,
    version: number,
    from: readonly GlobalEventState[],
    change: Change,
  ): Promise<GlobalEventDetailDto> {
    const stored = await this.prisma.globalEvent.findUnique({ where: { id } });
    refuseUnlessChangeable(stored, from, version);
    const changed = { ...stored, ...change };
    const timed = change.startsAt !== undefined || change.endsAt !== undefined;
    if (timed && changed.startsAt !== null && changed.endsAt !== null && changed.endsAt <= changed.startsAt) {
      throw new BadRequestException(['endsAt: The end must be after the start']);
    }
    const missing = missingFor(changed);
    if (changed.state === GlobalEventState.published && missing.length > 0) {
      throw conflict('GLOBAL_EVENT_INCOMPLETE', 'A published Global Event needs a start and a position.', { missing });
    }
    const [written] = await this.prisma.globalEvent.updateManyAndReturn({
      where: { id, version },
      data: { ...change, version: { increment: 1 } },
    });
    // Changed between the read and the write: checked again as it is now.
    if (written === undefined) {
      return this.change(id, version, from, change);
    }
    if (stored.state === GlobalEventState.published || written.state === GlobalEventState.published) {
      this.signalChanged();
    }
    if (stored.state === GlobalEventState.published) {
      this.signals.send(await this.quests.holderIdsFor(id), 'quests-changed');
    }
    return toGlobalEventDetailDto(written);
  }

  // A body's rule that needs the Campus Boundary, so it is checked here rather than by the body's schema.
  private refuseOffCampus({ latitude, longitude }: { latitude?: number | null; longitude?: number | null }): void {
    if (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !this.campusBoundary.contains({ latitude, longitude })
    ) {
      throw new BadRequestException(['latitude: The position must be inside the Campus Boundary']);
    }
  }

  // Every Draft, or the published events that have not ended.
  private findListed(state: ListedState): Promise<GlobalEvent[]> {
    return this.prisma.globalEvent.findMany({
      where: state === GlobalEventState.published ? { state, ...notEnded(new Date()) } : { state },
      orderBy: BY_START,
    });
  }
}
