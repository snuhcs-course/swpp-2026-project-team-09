/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { type Party, type Prisma } from '../generated/prisma/client.js';
import { RoomRequestSync } from '../library/room-request-sync.service.js';
import { VisibilityService } from '../location-sharing/visibility.service.js';
import { QuestsService } from './quests.service.js';

// A Party's members in the order they entered, as `PARTY_INCLUDE` lists them.
const ENTRY_ORDER = [{ joinedAt: 'asc' }, { id: 'asc' }] satisfies Prisma.PartyMemberOrderByWithRelationInput[];

// The Party running for a Quest (its activation), as the Quest's changes reach it, and the one rule of a member's way
// out that PartiesService keeps too. Here, not in PartiesService, because the parties module imports the quests module.
// But for `drop`, sends no signal: each method answers the Users to send `party-changed` to once the transaction
// commits, and the caller wraps the transaction in VisibilityService.announceRemovals for the members it may take out.
@Injectable()
export class QuestParty {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendsService,
    private readonly quests: QuestsService,
    private readonly visibility: VisibilityService,
    private readonly signals: SignalsService,
    private readonly roomRequests: RoomRequestSync,
  ) {}

  // A Holder's drop of the Quest. The last Holder's deletes the Quest, and closes its Party, if one runs, first.
  async drop(userId: string, questId: string): Promise<void> {
    const partyAudience = await this.visibility.announceRemovals(await this.memberIdsOf(questId), () =>
      this.quests.changeShared(userId, questId, async (tx) => {
        const last = (await this.quests.holderIds(questId, tx)).length === 1;
        const closed = last ? await this.close(questId, tx) : [];
        await this.quests.removeHolder(questId, userId, tx);
        return closed;
      }),
    );
    this.signals.send(partyAudience, 'party-changed');
    await this.roomRequests.questChanged(questId);
  }

  // The members of the Quest's Party, read before a change that may take them out.
  async memberIdsOf(questId: string): Promise<string[]> {
    const party = await this.prisma.party.findUnique({ where: { questId }, select: { id: true } });
    return party === null ? [] : this.memberIds(party, this.prisma);
  }

  // Takes the User out of the Quest's Party, if they are in it, as leaving does. Lock the User first.
  async leave(questId: string, userId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    const party = await this.lockedOf(questId, tx);
    if (party === null || (await tx.partyMember.findUnique({ where: { userId } }))?.partyId !== party.id) {
      return [];
    }
    return this.removeMember(party, userId, tx);
  }

  // Ends the Quest's Party with its members, requests and invitations. Call it before the Quest is deleted, which would
  // leave the Party without one.
  async close(questId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    const party = await this.lockedOf(questId, tx);
    if (party === null) {
      return [];
    }
    const audience = await this.audienceOf(party, tx);
    await tx.party.delete({ where: { id: party.id } });
    return audience;
  }

  // Takes the User out of the Party. When the Leader goes, the member who entered earliest becomes Leader, and the
  // Party ends with its last member. Every way out ends here, after the User and then the Party were locked.
  async removeMember(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    const audience = await this.audienceOf(party, tx);
    await tx.partyMember.delete({ where: { userId } });
    const [earliest] = await this.memberIds(party, tx);
    if (earliest === undefined) {
      await tx.party.delete({ where: { id: party.id } });
    } else if (party.leaderId === userId) {
      await tx.party.update({ where: { id: party.id }, data: { leaderId: earliest } });
    }
    return audience;
  }

  // Who is told of a change to the Party: its members, the Holders of its Quest and the Friends of its members.
  async audienceOf(party: Pick<Party, 'id' | 'questId'>, tx: Prisma.TransactionClient): Promise<string[]> {
    const memberIds = await this.memberIds(party, tx);
    const holders =
      party.questId === null
        ? []
        : await tx.questHolder.findMany({ where: { questId: party.questId }, select: { userId: true } });
    const holderIds = holders.map((holder) => holder.userId);
    return [...new Set([...memberIds, ...holderIds, ...(await this.friends.friendsOfAny(memberIds, tx))])];
  }

  // In the order they entered.
  async memberIds(party: Pick<Party, 'id'>, tx: Prisma.TransactionClient): Promise<string[]> {
    const members = await tx.partyMember.findMany({
      where: { partyId: party.id },
      select: { userId: true },
      orderBy: ENTRY_ORDER,
    });
    return members.map((member) => member.userId);
  }

  // The Quest's Party, its row locked until the transaction ends, or null when the Quest has none.
  private async lockedOf(questId: string, tx: Prisma.TransactionClient): Promise<Party | null> {
    const found = await tx.party.findUnique({ where: { questId }, select: { id: true } });
    if (found === null) {
      return null;
    }
    await tx.$queryRaw`SELECT 1 FROM parties WHERE id = ${found.id}::uuid FOR NO KEY UPDATE`;
    return tx.party.findUnique({ where: { id: found.id } });
  }
}
