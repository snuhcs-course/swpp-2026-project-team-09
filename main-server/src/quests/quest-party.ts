/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { type Party, type Prisma } from '../generated/prisma/client.js';
import { RoomRequestSync } from '../library/room-request-sync.service.js';
import { VisibilityService } from '../location-sharing/visibility.service.js';
import { PARTY_INCLUDE } from '../parties/dto/party.dto.js';
import { type Told } from '../notifications/notification.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UsersService } from '../users/users.service.js';
import { CLOCK, type Clock } from './clock.js';
import { newLeaderTold, tellNewLeader } from './new-leader.js';
import { QuestsService } from './quests.service.js';

// The Party running for a Quest (its activation), as the Quest's changes reach it, and the one rule of a member's way
// out that PartiesService keeps too. Here, not in PartiesService, because the parties module imports the quests module.
// The rules send no signal: each answers the Users to send `party-changed` to once the transaction commits, and the
// caller wraps the transaction in VisibilityService.announceRemovals for the members it may take out. `drop`, a Holder's
// drop of the Quest, lives here too, as the Quest change that closes the Party, and sends its own signals.
@Injectable()
export class QuestParty {
  private readonly logger = new Logger(QuestParty.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendsService,
    private readonly quests: QuestsService,
    private readonly visibility: VisibilityService,
    private readonly signals: SignalsService,
    private readonly roomRequests: RoomRequestSync,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // A Holder's drop of the Quest. The last Holder's deletes the Quest, and closes its Party, if one runs, first. The
  // Leader's makes the Holder who entered earliest Leader, who is told.
  async drop(userId: string, questId: string): Promise<void> {
    const { partyAudience, newLeader } = await this.visibility.announceRemovals(await this.memberIdsOf(questId), () =>
      this.quests.changeShared(userId, questId, async (tx) => {
        const last = (await this.quests.holderIds(questId, tx)).length === 1;
        const closed = last ? await this.close(questId, tx) : [];
        const leaderId = await this.quests.removeHolder(questId, userId, tx);
        // The Quest and the Leader's row stay: one who leads now means others hold it.
        const told = leaderId === null ? null : await newLeaderTold(questId, userId, 'left', tx);
        return { partyAudience: closed, newLeader: leaderId === null || told === null ? null : { leaderId, told } };
      }),
    );
    this.signals.send(partyAudience, 'party-changed');
    if (newLeader !== null) {
      tellNewLeader(
        { notifications: this.notifications, logger: this.logger },
        newLeader.leaderId,
        newLeader.told,
        this.clock.now(),
      );
    }
    await this.roomRequests.questChanged(questId);
  }

  // Locks the rows of the Users, in the order of their ids, as a Party's end does before the Party: call it before the
  // Quest is locked, with the members `memberIdsOf` read, so that a member's way out at the same moment runs before or
  // after the change.
  async lockMembers(memberIds: readonly string[], tx: Prisma.TransactionClient): Promise<void> {
    await memberIds.toSorted().reduce(async (locked, memberId) => {
      await locked;
      await this.users.lock(memberId, tx);
    }, Promise.resolve());
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
    await this.delete(party, tx);
    return audience;
  }

  // Takes the User out of the Party. When the Leader goes, the member who entered earliest becomes Leader, and the
  // Party ends with its last member. Every way out ends here, after the User and then the Party were locked.
  async removeMember(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    const audience = await this.audienceOf(party, tx);
    await tx.partyMember.delete({ where: { userId } });
    const [earliest] = await this.memberIds(party, tx);
    if (earliest === undefined) {
      await this.delete(party, tx);
    } else if (party.leaderId === userId) {
      await tx.party.update({ where: { id: party.id }, data: { leaderId: earliest } });
    }
    return audience;
  }

  // Who is told of a change to the Party: its members, the Holders of its Quest and the Friends of its members.
  async audienceOf(party: Pick<Party, 'id' | 'questId'>, tx: Prisma.TransactionClient): Promise<string[]> {
    const memberIds = await this.memberIds(party, tx);
    const holderIds = party.questId === null ? [] : await this.quests.holderIds(party.questId, tx);
    return [...new Set([...memberIds, ...holderIds, ...(await this.friends.friendsOfAny(memberIds, tx))])];
  }

  // Deletes the Party with its members, requests and invitations, and the Holders' Notifications that it opened: every
  // way a Party ends ends here.
  async delete(party: Pick<Party, 'id' | 'questId'>, tx: Prisma.TransactionClient): Promise<void> {
    if (party.questId !== null) {
      await tx.notification.deleteMany({
        where: { kind: 'party-activated', cardKind: 'party', cardId: party.questId },
      });
    }
    await tx.party.delete({ where: { id: party.id } });
  }

  // What each other Holder of the Quest is told of its Party opened by the User, read in the opening's transaction
  // (P06 ticket 21).
  async activationTold(questId: string, openerId: string, tx: Prisma.TransactionClient): Promise<[string, Told][]> {
    const [{ title }, { name }, holderIds] = await Promise.all([
      tx.quest.findUniqueOrThrow({ where: { id: questId }, select: { title: true } }),
      tx.user.findUniqueOrThrow({ where: { id: openerId }, select: { name: true } }),
      this.quests.holderIds(questId, tx),
    ]);
    const told: Told = { kind: 'party-activated', questId, questTitle: title, byName: name };
    return holderIds.filter((id) => id !== openerId).map((id) => [id, told]);
  }

  // Not awaited: one Holder's Notification never fails the opening. Opening again rings again and replaces the one kept.
  tellActivated(told: readonly [string, Told][]): void {
    for (const [userId, one] of told) {
      this.notifications.schedule(userId, one, this.clock.now()).catch((error: unknown) => {
        this.logger.warn(`A Holder was not told of a Party opened: ${String(error)}`);
      });
    }
  }

  // In the order they entered.
  async memberIds(party: Pick<Party, 'id'>, tx: Prisma.TransactionClient): Promise<string[]> {
    const members = await tx.partyMember.findMany({
      where: { partyId: party.id },
      select: { userId: true },
      orderBy: PARTY_INCLUDE.members.orderBy,
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
