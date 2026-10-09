/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { UsersService } from '../users/users.service.js';
import { invitationInclude, InvitationDto, toInvitationDto } from './dto/invitations.dto.js';
import { PartyDto } from './dto/party.dto.js';
import { LeaderService } from './leader.service.js';
import { PartiesService } from './parties.service.js';
import { alreadyMember, conflict, notFound } from './refusals.js';

const invitationNotFound = (): NotFoundException =>
  notFound('PARTY_INVITATION_NOT_FOUND', 'No such invitation waits for this User.');

// The Leader's invitations of Friends and of Holders of the Party's Quest. An invitation admits whatever the Join Policy
// is, waits until the invited User answers it, and ends with the Party and when the User enters any Party
// (PartiesService.admit).
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

  // A User in another Party may be invited, and is refused on accepting unless they left it by then.
  async invite(leaderId: string, userId: string): Promise<void> {
    const partyId = await this.leader.ledBy(leaderId);
    await this.prisma.$transaction(async (tx) => {
      const party = await this.leader.lockLed(partyId, leaderId, tx);
      if ((await this.parties.memberIds(party, tx)).includes(userId)) {
        throw alreadyMember();
      }
      if (
        !(await this.friends.areFriends(leaderId, userId, tx)) &&
        !(await this.parties.holdsQuest(party, userId, tx))
      ) {
        throw notFound('INVITEE_NOT_FOUND', "This User is neither your Friend nor a Holder of the Party's Quest.");
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
      include: invitationInclude(userId),
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    });
    const friendIds = new Set(await this.friends.friendsOfAny([userId]));
    return invitations.map((invitation) => toInvitationDto(invitation, friendIds));
  }

  async accept(userId: string, invitationId: string): Promise<PartyDto> {
    const audience = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      const invitation = await tx.partyInvitation.findFirst({ where: { id: invitationId, userId } });
      if (invitation === null) {
        throw invitationNotFound();
      }
      return this.parties.admit(await this.parties.lock(invitation.partyId, tx), userId, tx);
    });
    this.signals.send(audience, 'party-changed');
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
