import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { QuestDto } from './dto/quest.dto.js';
import { toWaitingDto, WAITING_INCLUDE, WaitingDto } from './dto/waiting.dto.js';
import { LeaderService } from './leader.service.js';
import { QuestsService } from './quests.service.js';
import { RecruitingService } from './recruiting.service.js';
import { alreadyHolder, conflict, notFound } from './refusals.js';

const invitationNotFound = (): NotFoundException =>
  notFound('QUEST_INVITATION_NOT_FOUND', 'No such invitation waits for this User.');

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
  ) {}

  async invite(leaderId: string, questId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.leader.lockLed(questId, leaderId, tx);
      if ((await this.quests.holderIds(questId, tx)).includes(userId)) {
        throw alreadyHolder();
      }
      if (!(await this.friends.areFriends(leaderId, userId, tx))) {
        throw notFound('FRIEND_NOT_FOUND', 'This User is not your Friend.');
      }
      if ((await tx.questInvitation.findUnique({ where: { questId_userId: { questId, userId } } })) !== null) {
        throw conflict('QUEST_INVITATION_ALREADY_SENT', 'An invitation of this User into the Quest is waiting.');
      }
      await tx.questInvitation.create({ data: { questId, userId } });
    });
    this.signals.send([userId], 'quests-changed');
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

  // A refused acceptance leaves the invitation waiting.
  async accept(userId: string, invitationId: string): Promise<QuestDto> {
    const { questId, holderIds } = await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.questInvitation.findFirst({ where: { id: invitationId, userId } });
      if (invitation === null) {
        throw invitationNotFound();
      }
      return { questId: invitation.questId, holderIds: await this.recruiting.enter(invitation.questId, userId, tx) };
    });
    this.signals.send(holderIds, 'quests-changed');
    return this.quests.read(userId, questId);
  }

  async decline(userId: string, invitationId: string): Promise<void> {
    const { count } = await this.prisma.questInvitation.deleteMany({ where: { id: invitationId, userId } });
    if (count === 0) {
      throw invitationNotFound();
    }
    this.signals.send([userId], 'quests-changed');
  }
}
