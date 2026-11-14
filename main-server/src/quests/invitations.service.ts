/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { RoomRequestSync } from '../library/room-request-sync.service.js';
import { invitationMessage } from '../push/messages.js';
import { PushService } from '../push/push.service.js';
import { QuestDto } from './dto/quest.dto.js';
import {
  toWaitingDto,
  toWaitingUserDto,
  WAITING_INCLUDE,
  WAITING_USER_INCLUDE,
  WaitingDto,
  WaitingUserDto,
} from './dto/waiting.dto.js';
import { LeaderService } from './leader.service.js';
import { QuestsService } from './quests.service.js';
import { RecruitingService } from './recruiting.service.js';
import { alreadyHolder, conflict, notFound } from './refusals.js';

export type CreatedInvitation = Prisma.QuestInvitationGetPayload<{ include: typeof WAITING_INCLUDE }>;

const invitationNotFound = (): NotFoundException => notFound('QUEST_INVITATION_NOT_FOUND', 'No such invitation waits.');

// The Leader's invitations of Friends. An invitation admits whatever the Join Policy is, waits until the invited User
// answers it, and ends with the Quest and when the User enters it in any way (RecruitingService.enter).
@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quests: QuestsService,
    private readonly recruiting: RecruitingService,
    private readonly leader: LeaderService,
    private readonly friends: FriendsService,
    private readonly signals: SignalsService,
    private readonly roomRequests: RoomRequestSync,
    private readonly push: PushService,
  ) {}

  async invite(leaderId: string, questId: string, userId: string): Promise<void> {
    const created = await this.prisma.$transaction(async (tx) => {
      await this.leader.lockLed(questId, leaderId, tx);
      if ((await this.quests.holderIds(questId, tx)).includes(userId)) {
        throw alreadyHolder();
      }
      return this.create(leaderId, questId, userId, tx);
    });
    this.announce(created);
  }

  // An invitation of the Leader's Friend into the Quest, in the caller's transaction. Announce it once that is committed.
  async create(
    leaderId: string,
    questId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<CreatedInvitation> {
    if (!(await this.friends.areFriends(leaderId, userId, tx))) {
      throw notFound('FRIEND_NOT_FOUND', 'This User is not your Friend.');
    }
    if ((await tx.questInvitation.findUnique({ where: { questId_userId: { questId, userId } } })) !== null) {
      throw conflict('QUEST_INVITATION_ALREADY_SENT', 'An invitation of this User into the Quest is waiting.');
    }
    await tx.questDecline.deleteMany({ where: { questId, userId } });
    return tx.questInvitation.create({ data: { questId, userId }, include: WAITING_INCLUDE });
  }

  announce(invitation: CreatedInvitation): void {
    this.signals.send([invitation.userId], 'quests-changed');
    void this.push.send([invitation.userId], invitationMessage(toWaitingDto(invitation)));
  }

  // The User's invitations, the newest first.
  async list(userId: string): Promise<WaitingDto[]> {
    const invitations = await this.prisma.questInvitation.findMany({
      where: { userId },
      include: WAITING_INCLUDE,
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    });
    return invitations.map((invitation) => toWaitingDto(invitation));
  }

  // The Quest's waiting invitations, the newest first.
  listSent(leaderId: string, questId: string): Promise<WaitingUserDto[]> {
    return this.prisma.$transaction(async (tx) => {
      await this.leader.lockLed(questId, leaderId, tx);
      const invitations = await tx.questInvitation.findMany({
        where: { questId },
        include: WAITING_USER_INCLUDE,
        orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
      });
      return invitations.map((invitation) => toWaitingUserDto(invitation));
    });
  }

  async cancel(leaderId: string, questId: string, invitationId: string): Promise<void> {
    const userId = await this.prisma.$transaction(async (tx) => {
      await this.leader.lockLed(questId, leaderId, tx);
      const invitation = await tx.questInvitation.findFirst({ where: { id: invitationId, questId } });
      if (invitation === null || (await tx.questInvitation.deleteMany({ where: { id: invitationId } })).count === 0) {
        throw invitationNotFound();
      }
      return invitation.userId;
    });
    this.signals.send([userId], 'quests-changed');
    await this.roomRequests.questChanged(questId);
  }

  // A refused acceptance leaves the invitation waiting. Checked again once the Quest is locked, so that an invitation
  // the Leader cancelled meanwhile admits nobody.
  async accept(userId: string, invitationId: string): Promise<QuestDto> {
    const { questId, holderIds, leaderId } = await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.questInvitation.findFirst({ where: { id: invitationId, userId } });
      if (invitation === null) {
        throw invitationNotFound();
      }
      const entered = await this.recruiting.enter(invitation.questId, userId, tx, async () => {
        if ((await tx.questInvitation.count({ where: { id: invitationId } })) === 0) {
          throw invitationNotFound();
        }
      });
      const quest = await tx.quest.findUniqueOrThrow({ where: { id: invitation.questId } });
      return { questId: invitation.questId, holderIds: entered, leaderId: quest.leaderId };
    });
    this.signals.send(holderIds, 'quests-changed');
    this.signals.send([leaderId], 'invitation-accepted', { questId, userId });
    await this.roomRequests.questChanged(questId);
    return this.quests.read(userId, questId);
  }

  // Keeps the decline in place of the invitation. Tells the Holders too, whose members list the User as declined.
  async decline(userId: string, invitationId: string): Promise<void> {
    const invitation = await this.prisma.questInvitation.findFirst({
      where: { id: invitationId, userId },
      include: { quest: { include: { holders: { select: { userId: true } } } } },
    });
    if (invitation === null) {
      throw invitationNotFound();
    }
    const { questId, quest } = invitation;
    await this.prisma.$transaction(async (tx) => {
      if ((await tx.questInvitation.deleteMany({ where: { id: invitationId, userId } })).count === 0) {
        throw invitationNotFound();
      }
      await tx.questDecline.deleteMany({ where: { questId, userId } });
      await tx.questDecline.create({ data: { questId, userId } });
    });
    this.signals.send([userId, ...quest.holders.map((holder) => holder.userId)], 'quests-changed');
    this.signals.send([quest.leaderId], 'invitation-declined', { questId, userId });
    await this.roomRequests.questChanged(questId);
  }
}
