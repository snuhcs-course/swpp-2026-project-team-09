// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-08, prompted by fyoon46, reviewed by TaeHyun79 in #47
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { Party, Prisma } from '../generated/prisma/client.js';
import { VisibilityService } from '../location-sharing/visibility.service.js';
import { UsersService } from '../users/users.service.js';
import { type UpdatePartyDto } from './dto/party-requests.dto.js';
import { PartyDto } from './dto/party.dto.js';
import { PartiesService } from './parties.service.js';
import { conflict, notFound, notInParty, notLeader } from './refusals.js';

const notMember = (): NotFoundException => notFound('NOT_PARTY_MEMBER', 'This User is not a member of this Party.');

// The Leader's controls, and the check that a User leads their Party. A Leader's action that adds or takes out a User
// locks that User before the Party, as every way in and out does, and checks the Leader once the Party is locked.
@Injectable()
export class LeaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly parties: PartiesService,
    private readonly signals: SignalsService,
    private readonly visibility: VisibilityService,
  ) {}

  // The Party the User leads, read without a lock, so that the Leader's actions are refused in the same order whatever
  // else they lock. Confirm it with lockLed() inside the transaction.
  async ledBy(userId: string): Promise<string> {
    const membership = await this.prisma.partyMember.findUnique({ where: { userId }, include: { party: true } });
    if (membership === null) {
      throw notInParty();
    }
    if (membership.party.leaderId !== userId) {
      throw notLeader();
    }
    return membership.partyId;
  }

  // Locks the Party, and refuses unless the User still leads it.
  async lockLed(partyId: string, userId: string, tx: Prisma.TransactionClient): Promise<Party> {
    const party = await this.parties.lock(partyId, tx);
    if (party.leaderId !== userId) {
      throw notLeader();
    }
    return party;
  }

  // A capacity below the number of members is refused. Requests that wait stay when the Join Policy changes.
  async update(userId: string, changes: UpdatePartyDto): Promise<PartyDto> {
    const partyId = await this.ledBy(userId);
    const audience = await this.prisma.$transaction(async (tx) => {
      const party = await this.lockLed(partyId, userId, tx);
      if (changes.capacity !== undefined && changes.capacity < (await this.parties.memberIds(party, tx)).length) {
        throw conflict('CAPACITY_BELOW_MEMBERS', 'The Party has more members than this capacity.');
      }
      await tx.party.update({ where: { id: party.id }, data: changes });
      return this.parties.audienceOf(party, tx);
    });
    this.signals.send(audience, 'party-changed');
    return this.parties.read(userId);
  }

  async handOver(userId: string, newLeaderId: string): Promise<void> {
    const partyId = await this.ledBy(userId);
    const memberIds = await this.prisma.$transaction(async (tx) => {
      const party = await this.lockLed(partyId, userId, tx);
      const ids = await this.parties.memberIds(party, tx);
      if (!ids.includes(newLeaderId)) {
        throw notMember();
      }
      await tx.party.update({ where: { id: party.id }, data: { leaderId: newLeaderId } });
      return ids;
    });
    this.signals.send(memberIds, 'party-changed');
  }

  // Ends the Party for every member at once, as when its last member leaves: it is deleted with its members, requests
  // and invitations, and every Quest stays. Locks every member, in the order of their ids, and then the Party, as every
  // way out does, so that a member who leaves at the same moment goes before or finds no Party.
  async end(userId: string): Promise<void> {
    const partyId = await this.ledBy(userId);
    const memberIds = await this.parties.memberIds({ id: partyId }, this.prisma);
    const audience = await this.visibility.announceRemovals(memberIds, () =>
      this.prisma.$transaction(async (tx) => {
        await [...new Set([userId, ...memberIds])].toSorted().reduce(async (locked, memberId) => {
          await locked;
          await this.users.lock(memberId, tx);
        }, Promise.resolve());
        if ((await tx.partyMember.findUnique({ where: { userId } }))?.partyId !== partyId) {
          throw notInParty();
        }
        const party = await this.lockLed(partyId, userId, tx);
        const told = await this.parties.audienceOf(party, tx);
        await tx.party.delete({ where: { id: party.id } });
        return told;
      }),
    );
    this.signals.send(audience, 'party-changed');
  }

  // Nothing records the removal, so the member may enter again.
  async remove(userId: string, memberId: string): Promise<void> {
    const partyId = await this.ledBy(userId);
    const memberIds = await this.visibility.announceRemovals(memberId, () =>
      this.prisma.$transaction(async (tx) => {
        await this.users.lock(memberId, tx);
        const party = await this.lockLed(partyId, userId, tx);
        const membership = await tx.partyMember.findUnique({ where: { userId: memberId } });
        if (membership?.partyId !== party.id) {
          throw notMember();
        }
        return this.parties.removeMember(party, memberId, tx);
      }),
    );
    this.signals.send(memberIds, 'party-changed');
  }
}
