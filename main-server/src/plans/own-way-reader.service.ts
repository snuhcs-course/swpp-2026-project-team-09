/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { MINUTE_MS } from '../assistant/gathering/gathering.js';
import { UserDayService } from '../assistant/free-time/user-day.service.js';
import { koreaDate } from '../assistant/korea-time.js';
import { CampusBoundary } from '../common/campus-boundary.js';
import { type Position } from '../common/geometry.js';
import { PrismaService } from '../common/prisma.service.js';
import { type PlaceDto } from '../places/dto/place.dto.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { type StoredQuest, type SubQuestDto, toSubQuestDto } from '../quests/dto/quest.dto.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../travel/travel.js';
import { type OwnWay } from './dto/invitation-card.dto.js';
import { type CardStep, type Gathered, gatheringOf, ownWay } from './own-way.js';

const startOf = ({ startsAt }: Pick<SubQuestDto, 'startsAt'>): number =>
  startsAt === null ? Number.POSITIVE_INFINITY : new Date(startsAt).getTime();

function toCardStep({ id, title, startsAt, endsAt, place, ended }: SubQuestDto): CardStep {
  return {
    id,
    title,
    start: startsAt === null ? null : new Date(startsAt),
    end: endsAt === null ? null : new Date(endsAt),
    placeId: place?.placeId ?? null,
    ended,
  };
}

export interface WayOptions {
  now: Date;
  position: Position | null;
  lateMinutes?: number;
  // Sub Quests left out of the User's day.
  leaveOut?: readonly string[];
}

// What a User's own way to a Quest's gathering is read from: the Quest's steps, the User's day, where the phone is,
// and the Places. The invitation's card and a late Holder's report read it alike.
@Injectable()
export class OwnWayReader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly days: UserDayService,
    private readonly places: PlaceLookup,
    private readonly boundary: CampusBoundary,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // A whole minute.
  now(): Date {
    return new Date(Math.ceil(this.clock.now().getTime() / MINUTE_MS) * MINUTE_MS);
  }

  // The Quest's steps as the User reads them, in the order of their starts, and its gathering.
  stepsOf(quest: StoredQuest, userId: string, now: Date): { steps: SubQuestDto[]; gathered: Gathered | null } {
    const steps = quest.subQuests
      .map((subQuest) => toSubQuestDto(subQuest, quest.globalEvent, userId, now))
      .toSorted((a, b) => startOf(a) - startOf(b));
    return {
      steps,
      gathered: gatheringOf(
        steps.map((step) => toCardStep(step)),
        this.travel,
      ),
    };
  }

  async way(gathered: Gathered, userId: string, leaderName: string, options: WayOptions): Promise<OwnWay> {
    const { now, position, lateMinutes, leaveOut = [] } = options;
    const [items, user] = await Promise.all([
      this.days.itemsOn(userId, koreaDate(gathered.destination.start)),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    ]);
    return ownWay(
      {
        gathered,
        invitee: { id: userId, name: user.name },
        leaderName,
        items: items.filter(({ id }) => !leaveOut.includes(id)),
        location: position === null ? null : this.locationOf(position),
        now,
        travel: this.travel,
        placeOf: this.placeOf,
      },
      lateMinutes,
    );
  }

  readonly placeOf = (placeId: string): PlaceDto => {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  };

  private locationOf(position: Position): { position: Position; placeId: string | null; onCampus: boolean } {
    const onCampus = this.boundary.contains(position);
    return { position, placeId: onCampus ? (this.places.at(position)?.place.id ?? null) : null, onCampus };
  }
}
