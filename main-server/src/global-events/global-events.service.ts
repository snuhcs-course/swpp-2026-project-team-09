/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CampusBoundary } from '../common/campus-boundary.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { GlobalEvent, GlobalEventState, Prisma, PublicationRoute } from '../generated/prisma/client.js';
import { QuestsService } from '../quests/quests.service.js';
import { conflict, notFound } from '../quests/refusals.js';
import { type CreateGlobalEventDto, type EditGlobalEventDto } from './dto/change-global-event.dto.js';
import {
  GlobalEventDetailDto,
  type GlobalEventWithJudgement,
  type GlobalEventWithOwnPost,
  ListedGlobalEventDto,
  type ListedState,
  missingFor,
  PublishedGlobalEventDto,
  toGlobalEventDetailDto,
  toListedGlobalEventDto,
  toPublishedGlobalEventDto,
  WITH_OWN_POST,
  WITH_OWN_POST_AND_JUDGEMENT,
} from './dto/global-event.dto.js';

// 00:00 in Asia/Seoul, which keeps +09:00 all year, of the day `now` falls on there.
function startOfSeoulDay(now: Date): Date {
  const day = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return new Date(`${day}T00:00:00+09:00`);
}

// An event has ended once its end has passed or, without an end, once the day of its start has passed in Asia/Seoul.
function notEnded(now: Date): Prisma.GlobalEventWhereInput {
  return { OR: [{ endsAt: { gt: now } }, { endsAt: null, startsAt: { gte: startOfSeoulDay(now) } }] };
}

// What the Assistant's searchGlobalEvents and resolveGlobalEvent ask for: the events that fall in the period
// [from, to), whose place holds `place`, whose title holds `title` and whose title or description holds any of
// `words`, ignoring case. An event without an end falls on the day of its start, and one without a start falls in no
// period. Without a period, any event that has not ended.
export interface PublishedSearch {
  period?: { from: Date; to: Date };
  place?: string;
  title?: string;
  words?: readonly string[];
  // The most events answered; left out, all of them.
  take?: number;
}

function holding(text: string): Prisma.StringFilter {
  return { contains: text, mode: 'insensitive' };
}

function searched({ period, place, title, words }: PublishedSearch): Prisma.GlobalEventWhereInput[] {
  return [
    ...(period === undefined
      ? []
      : [
          {
            startsAt: { lt: period.to },
            OR: [{ endsAt: { gt: period.from } }, { endsAt: null, startsAt: { gte: period.from } }],
          },
        ]),
    ...(place === undefined ? [] : [{ place: holding(place) }]),
    ...(title === undefined ? [] : [{ title: holding(title) }]),
    ...(words === undefined || words.length === 0
      ? []
      : [{ OR: words.flatMap((word) => [{ title: holding(word) }, { description: holding(word) }]) }]),
  ];
}

// What an edit or a change of state writes besides the version.
type Change = Partial<
  Pick<GlobalEvent, 'title' | 'description' | 'startsAt' | 'endsAt' | 'place' | 'latitude' | 'longitude' | 'state'>
>;

const globalEventNotFound = (): NotFoundException => notFound('GLOBAL_EVENT_NOT_FOUND', 'No Global Event has this id.');

// Refuses a change from `version` to an event that does not exist, that is not in one of the states `from`, or whose
// stored version is another.
function refuseUnlessChangeable(
  stored: GlobalEventWithJudgement | null,
  from: readonly GlobalEventState[],
  version: number,
): asserts stored is GlobalEventWithJudgement {
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
    private readonly signals: SignalsService,
    private readonly campusBoundary: CampusBoundary,
    private readonly quests: QuestsService,
  ) {}

  // Tells every connected app to fetch the published Global Events again. Call it once a change to them is committed.
  signalChanged(): void {
    this.signals.send('everyone', 'global-events-changed');
  }

  async listPublished(): Promise<PublishedGlobalEventDto[]> {
    return (await this.findListed(GlobalEventState.published)).map((event) => toPublishedGlobalEventDto(event));
  }

  // The published events of the search that have not ended at `now`, as the User's list serves them and in its order.
  async searchPublished(search: PublishedSearch, now: Date): Promise<PublishedGlobalEventDto[]> {
    const events = await this.prisma.globalEvent.findMany({
      where: { state: GlobalEventState.published, AND: [notEnded(now), ...searched(search)] },
      orderBy: BY_START,
      take: search.take,
      include: WITH_OWN_POST,
    });
    return events.map((event) => toPublishedGlobalEventDto(event));
  }

  // The events among `ids` that are published, as the User's list serves them, in the order of `ids`.
  async publishedAmong(ids: readonly string[]): Promise<PublishedGlobalEventDto[]> {
    const events = await this.prisma.globalEvent.findMany({
      where: { id: { in: [...ids] }, state: GlobalEventState.published },
      include: WITH_OWN_POST,
    });
    return ids.flatMap((id) => {
      const event = events.find((each) => each.id === id);
      return event === undefined ? [] : [toPublishedGlobalEventDto(event)];
    });
  }

  async listForAdministrators(state: ListedState): Promise<ListedGlobalEventDto[]> {
    return (await this.findListed(state)).map((event) => toListedGlobalEventDto(event));
  }

  // In any state.
  async read(id: string): Promise<GlobalEventDetailDto> {
    const event = await this.prisma.globalEvent.findUnique({ where: { id }, include: WITH_OWN_POST_AND_JUDGEMENT });
    if (event === null) {
      throw globalEventNotFound();
    }
    return toGlobalEventDetailDto(event);
  }

  async create(fields: CreateGlobalEventDto): Promise<GlobalEventDetailDto> {
    this.refuseOffCampus(fields);
    return toGlobalEventDetailDto(
      await this.prisma.globalEvent.create({ data: fields, include: WITH_OWN_POST_AND_JUDGEMENT }),
    );
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
  // compares the version and the state, so that of two changes from the same version one is applied and the other
  // refused, and a change checked against a Draft is checked again when the step after a Collection published it
  // meanwhile, which leaves the version as it is. An event that stays or becomes published by this change has an
  // Administrator's route: they have looked at it. A change Users see is announced once written: to every app, and to
  // the Holders of the event's Quests when the event was published.
  private async change(
    id: string,
    version: number,
    from: readonly GlobalEventState[],
    change: Change,
  ): Promise<GlobalEventDetailDto> {
    const stored = await this.prisma.globalEvent.findUnique({ where: { id }, include: WITH_OWN_POST_AND_JUDGEMENT });
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
      where: { id, version, state: stored.state },
      data: {
        ...change,
        ...(changed.state === GlobalEventState.published ? { publicationRoute: PublicationRoute.administrator } : {}),
        version: { increment: 1 },
      },
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
    return toGlobalEventDetailDto({ ...written, sessions: stored.sessions });
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
  private findListed(state: ListedState): Promise<GlobalEventWithOwnPost[]> {
    return this.prisma.globalEvent.findMany({
      where: state === GlobalEventState.published ? { state, ...notEnded(new Date()) } : { state },
      orderBy: BY_START,
      include: WITH_OWN_POST,
    });
  }
}
