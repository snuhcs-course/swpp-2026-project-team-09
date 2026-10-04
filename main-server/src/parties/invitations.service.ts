import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { UsersService } from '../users/users.service.js';
import { INVITATION_INCLUDE, InvitationDto, toInvitationDto } from './dto/invitations.dto.js';
import { PartyDto } from './dto/party.dto.js';
import { LeaderService } from './leader.service.js';
import { PartiesService } from './parties.service.js';
import { alreadyMember, conflict, notFound } from './refusals.js';

const invitationNotFound = (): NotFoundException =>
  notFound('PARTY_INVITATION_NOT_FOUND', 'No such invitation waits for this User.');

// The Leader's invitations of Friends. An invitation admits whatever the Join Policy is, waits until the invited User
// answers it, and ends with the Party and when the User enters any Party (PartiesService.admit).
@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly parties: PartiesService,
    private readonly leader: LeaderService,
    private readonly friends: FriendsService,
    private readonly signals: SignalsService,
  ) {}

  // A Friend in another Party may be invited, and is refused on accepting unless they left it by then.
  async invite(leaderId: string, userId: string): Promise<void> {
    const partyId = await this.leader.ledBy(leaderId);
    await this.prisma.$transaction(async (tx) => {
      await this.leader.lockLed(partyId, leaderId, tx);
      if ((await this.parties.memberIds(partyId, tx)).includes(userId)) {
        throw alreadyMember();
      }
      if (!(await this.friends.areFriends(leaderId, userId, tx))) {
        throw notFound('FRIEND_NOT_FOUND', 'This User is not your Friend.');
      }
      if ((await tx.partyInvitation.findUnique({ where: { partyId_userId: { partyId, userId } } })) !== null) {
        throw conflict('PARTY_INVITATION_ALREADY_SENT', 'An invitation of this User into the Party is waiting.');
      }
      await tx.partyInvitation.create({ data: { partyId, userId } });
    });
    this.signals.send([userId], 'party-changed');
  }

  // The User's invitations, the newest first.
  async list(userId: string): Promise<InvitationDto[]> {
    const invitations = await this.prisma.partyInvitation.findMany({
      where: { userId },
      include: INVITATION_INCLUDE,
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    });
    return invitations.map((invitation) => toInvitationDto(invitation));
  }

  async accept(userId: string, invitationId: string): Promise<PartyDto> {
    const { memberIds, holderIds } = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      const invitation = await tx.partyInvitation.findFirst({ where: { id: invitationId, userId } });
      if (invitation === null) {
        throw invitationNotFound();
      }
      return this.parties.admit(await this.parties.lock(invitation.partyId, tx), userId, tx);
    });
    this.signals.send(memberIds, 'party-changed');
    this.signals.send(holderIds, 'quests-changed');
    return this.parties.read(userId);
  }

  async decline(userId: string, invitationId: string): Promise<void> {
    const { count } = await this.prisma.partyInvitation.deleteMany({ where: { id: invitationId, userId } });
    if (count === 0) {
      throw invitationNotFound();
    }
    this.signals.send([userId], 'party-changed');
  }
}
