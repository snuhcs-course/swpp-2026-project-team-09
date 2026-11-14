/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { koreaTime } from '../assistant/korea-time.js';
import { type Position } from '../common/geometry.js';
import { PrismaService } from '../common/prisma.service.js';
import { QUEST_INCLUDE, toQuestSummaryDto } from '../quests/dto/quest.dto.js';
import { notFound } from '../quests/refusals.js';
import { type InvitationCardDto } from './dto/invitation-card.dto.js';
import { placePoint } from './own-way.js';
import { OwnWayReader } from './own-way-reader.service.js';

// The invitation as the invited User opens it, with their own way, computed at each read. Nothing of it is stored,
// logged, or sent to anyone.
@Injectable()
export class InvitationCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ways: OwnWayReader,
  ) {}

  async read(userId: string, invitationId: string, position: Position | null): Promise<InvitationCardDto> {
    const invitation = await this.prisma.questInvitation.findFirst({
      where: { id: invitationId, userId },
      include: { quest: { include: QUEST_INCLUDE } },
    });
    if (invitation === null) {
      throw notFound('QUEST_INVITATION_NOT_FOUND', 'No such invitation waits.');
    }
    const now = this.ways.now();
    const { quest } = invitation;
    const { steps, gathered } = this.ways.stepsOf(quest, userId, now);
    const card = {
      id: invitation.id,
      sentAt: invitation.sentAt.toISOString(),
      quest: toQuestSummaryDto(quest),
      holders: quest.holders
        .map(({ user }) => ({ id: user.id, name: user.name }))
        .toSorted((a, b) => Number(b.id === quest.leaderId) - Number(a.id === quest.leaderId)),
      steps: steps.map(({ id, title, startsAt, endsAt, place }) => ({ id, title, startsAt, endsAt, place })),
    };
    if (gathered === null) {
      return { ...card, gathering: null, way: null };
    }
    const { destination } = gathered;
    const gathering = {
      place: placePoint(destination.placeId, this.ways.placeOf),
      startAt: koreaTime(destination.start),
      endAt: destination.end === null ? null : koreaTime(destination.end),
    };
    const way = await this.ways.way(gathered, userId, quest.leader.name, { now, position });
    return { ...card, gathering, way };
  }
}
