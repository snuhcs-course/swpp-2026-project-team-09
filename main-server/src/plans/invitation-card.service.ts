/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { MINUTE_MS } from '../assistant/gathering/gathering.js';
import { UserDayService } from '../assistant/free-time/user-day.service.js';
import { koreaDate, koreaTime } from '../assistant/korea-time.js';
import { CampusBoundary } from '../common/campus-boundary.js';
import { type Position } from '../common/geometry.js';
import { PrismaService } from '../common/prisma.service.js';
import { type PlaceDto } from '../places/dto/place.dto.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { QUEST_INCLUDE, type SubQuestDto, toQuestSummaryDto, toSubQuestDto } from '../quests/dto/quest.dto.js';
import { notFound } from '../quests/refusals.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../travel/travel.js';
import { type InvitationCardDto } from './dto/invitation-card.dto.js';
import { type CardStep, type Gathered, gatheringOf, ownWay, placePoint } from './own-way.js';

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

// The invitation as the invited User opens it, with their own way, computed at each read. Nothing of it is stored,
// logged, or sent to anyone.
@Injectable()
export class InvitationCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly days: UserDayService,
    private readonly places: PlaceLookup,
    private readonly boundary: CampusBoundary,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async read(userId: string, invitationId: string, position: Position | null): Promise<InvitationCardDto> {
    const invitation = await this.prisma.questInvitation.findFirst({
      where: { id: invitationId, userId },
      include: { quest: { include: QUEST_INCLUDE } },
    });
    if (invitation === null) {
      throw notFound('QUEST_INVITATION_NOT_FOUND', 'No such invitation waits.');
    }
    const now = new Date(Math.ceil(this.clock.now().getTime() / MINUTE_MS) * MINUTE_MS);
    const { quest } = invitation;
    const read = quest.subQuests
      .map((subQuest) => toSubQuestDto(subQuest, quest.globalEvent, userId, now))
      .toSorted((a, b) => startOf(a) - startOf(b));
    const card = {
      id: invitation.id,
      sentAt: invitation.sentAt.toISOString(),
      quest: toQuestSummaryDto(quest),
      holders: quest.holders
        .map(({ user }) => ({ id: user.id, name: user.name }))
        .toSorted((a, b) => Number(b.id === quest.leaderId) - Number(a.id === quest.leaderId)),
      steps: read.map(({ id, title, startsAt, endsAt, place }) => ({ id, title, startsAt, endsAt, place })),
    };
    const gathered = gatheringOf(
      read.map((subQuest) => toCardStep(subQuest)),
      this.travel,
    );
    if (gathered === null) {
      return { ...card, gathering: null, way: null };
    }
    return { ...card, ...(await this.wayTo(gathered, userId, quest.leader.name, { now, position })) };
  }

  private async wayTo(
    gathered: Gathered,
    userId: string,
    leaderName: string,
    { now, position }: { now: Date; position: Position | null },
  ): Promise<Pick<InvitationCardDto, 'gathering' | 'way'>> {
    const { destination } = gathered;
    const [items, user] = await Promise.all([
      this.days.itemsOn(userId, koreaDate(destination.start)),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    ]);
    const placeOf = (placeId: string): PlaceDto => {
      const place = this.places.byId(placeId);
      if (place === null) {
        throw new Error(`No Place ${placeId}`);
      }
      return place;
    };
    const way = ownWay({
      gathered,
      invitee: { id: userId, name: user.name },
      leaderName,
      items,
      location: position === null ? null : this.locationOf(position),
      now,
      travel: this.travel,
      placeOf,
    });
    const gathering = {
      place: placePoint(destination.placeId, placeOf),
      startAt: koreaTime(destination.start),
      endAt: destination.end === null ? null : koreaTime(destination.end),
    };
    return { gathering, way };
  }

  private locationOf(position: Position): { position: Position; placeId: string | null; onCampus: boolean } {
    const onCampus = this.boundary.contains(position);
    return { position, placeId: onCampus ? (this.places.at(position)?.place.id ?? null) : null, onCampus };
  }
}
