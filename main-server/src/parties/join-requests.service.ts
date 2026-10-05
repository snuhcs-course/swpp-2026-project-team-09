import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { JoinPolicy } from '../generated/prisma/client.js';
import { FriendsService } from '../friends/friends.service.js';
import { UsersService } from '../users/users.service.js';
import {
  ReceivedJoinRequestDto,
  sentJoinRequestInclude,
  SentJoinRequestDto,
  toReceivedJoinRequestDto,
  toSentJoinRequestDto,
} from './dto/join-requests.dto.js';
import { USER_SUMMARY } from './dto/party.dto.js';
import { LeaderService } from './leader.service.js';
import { PartiesService } from './parties.service.js';
import { alreadyMember, conflict, notFound, partyNotFound } from './refusals.js';

const joinRequestNotFound = (): NotFoundException =>
  notFound('JOIN_REQUEST_NOT_FOUND', 'No such request to enter waits for this answer from this User.');

// Requests to enter an Approval Party. A request waits until the User withdraws it or the Leader answers it, and ends
// with the Party and when the User enters any Party (PartiesService.admit).
@Injectable()
export class JoinRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly parties: PartiesService,
    private readonly leader: LeaderService,
    private readonly friends: FriendsService,
    private readonly signals: SignalsService,
  ) {}

  // Whoever can see the Party asks: a Friend of a member, and a Holder of its Quest, who could enter at once instead. A
  // User in another Party may ask, and is refused when the Leader accepts unless they left it by then.
  async ask(userId: string, partyId: string): Promise<SentJoinRequestDto> {
    const { request, leaderId } = await this.prisma.$transaction(async (tx) => {
      const party = await this.parties.lock(partyId, tx);
      if ((await this.parties.memberIds(party, tx)).includes(userId)) {
        throw alreadyMember();
      }
      if (!(await this.parties.canSee(party, userId, tx))) {
        throw partyNotFound();
      }
      if (party.joinPolicy !== JoinPolicy.approval) {
        throw conflict('PARTY_NOT_APPROVAL', 'Only an Approval Party takes requests to enter.');
      }
      if ((await tx.partyJoinRequest.findUnique({ where: { partyId_userId: { partyId, userId } } })) !== null) {
        throw conflict('JOIN_REQUEST_ALREADY_SENT', 'Your request to enter this Party is waiting.');
      }
      return {
        request: await tx.partyJoinRequest.create({
          data: { partyId, userId },
          include: sentJoinRequestInclude(userId),
        }),
        leaderId: party.leaderId,
      };
    });
    this.signals.send([leaderId], 'party-changed');
    return toSentJoinRequestDto(request, new Set(await this.friends.friendsOfAny([userId])));
  }

  // The User's own waiting requests, the newest first.
  async listSent(userId: string): Promise<SentJoinRequestDto[]> {
    const requests = await this.prisma.partyJoinRequest.findMany({
      where: { userId },
      include: sentJoinRequestInclude(userId),
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    });
    const friendIds = new Set(await this.friends.friendsOfAny([userId]));
    return requests.map((request) => toSentJoinRequestDto(request, friendIds));
  }

  // The User's row is locked, as for the Leader's acceptance, so that a request is not both withdrawn and accepted.
  async withdraw(userId: string, requestId: string): Promise<void> {
    const leaderId = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      const request = await tx.partyJoinRequest.findFirst({
        where: { id: requestId, userId },
        include: { party: true },
      });
      if (request === null || (await tx.partyJoinRequest.deleteMany({ where: { id: requestId } })).count === 0) {
        throw joinRequestNotFound();
      }
      return request.party.leaderId;
    });
    this.signals.send([leaderId], 'party-changed');
  }

  // The requests to the Party the User leads, the newest first.
  async listReceived(leaderId: string): Promise<ReceivedJoinRequestDto[]> {
    const partyId = await this.leader.ledBy(leaderId);
    const requests = await this.prisma.partyJoinRequest.findMany({
      where: { partyId },
      include: { user: USER_SUMMARY },
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    });
    return requests.map((request) => toReceivedJoinRequestDto(request));
  }

  // Locks the User who asked before the Party, as every way into a Party does, and checks the Leader after. Whatever the
  // Join Policy is by now: accepting is the Leader's own decision, as an invitation is.
  async accept(leaderId: string, requestId: string): Promise<void> {
    const partyId = await this.leader.ledBy(leaderId);
    const request = await this.prisma.partyJoinRequest.findFirst({ where: { id: requestId, partyId } });
    if (request === null) {
      throw joinRequestNotFound();
    }
    const audience = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(request.userId, tx);
      const party = await this.leader.lockLed(partyId, leaderId, tx);
      if ((await tx.partyJoinRequest.findUnique({ where: { id: requestId } })) === null) {
        throw joinRequestNotFound();
      }
      return this.parties.admit(party, request.userId, tx);
    });
    this.signals.send(audience, 'party-changed');
  }

  async decline(leaderId: string, requestId: string): Promise<void> {
    const partyId = await this.leader.ledBy(leaderId);
    const userId = await this.prisma.$transaction(async (tx) => {
      await this.leader.lockLed(partyId, leaderId, tx);
      const request = await tx.partyJoinRequest.findFirst({ where: { id: requestId, partyId } });
      if (request === null || (await tx.partyJoinRequest.deleteMany({ where: { id: requestId } })).count === 0) {
        throw joinRequestNotFound();
      }
      return request.userId;
    });
    this.signals.send([userId], 'party-changed');
  }
}
