/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { JoinPolicy, Party, Prisma } from '../generated/prisma/client.js';
import { VisibilityService } from '../location-sharing/visibility.service.js';
import { QuestParty } from '../quests/quest-party.js';
import { QuestsService } from '../quests/quests.service.js';
import { questNotFound, takenAloneRefused } from '../quests/refusals.js';
import { UsersService } from '../users/users.service.js';
import { type OpenPartyDto } from './dto/party-requests.dto.js';
import {
  PARTY_INCLUDE,
  PartyDto,
  toPartyDto,
  toVisiblePartyDto,
  visiblePartyInclude,
  VisiblePartyDto,
} from './dto/party.dto.js';
import { conflict, notInParty, partyNotFound } from './refusals.js';

// Who opens, enters and leaves a Party. Every change to a Party's membership locks the User who enters or goes first and
// then the Party, so that changes to one Party, and those of one User, run one after another. Entering or leaving
// changes no Quest.
@Injectable()
export class PartiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly quests: QuestsService,
    private readonly friends: FriendsService,
    private readonly signals: SignalsService,
    private readonly visibility: VisibilityService,
    private readonly questParty: QuestParty,
  ) {}

  async open(userId: string, { title, capacity, joinPolicy, questId }: OpenPartyDto): Promise<PartyDto> {
    const audience = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      await this.refuseMember(userId, tx);
      if (questId !== null) {
        await this.checkQuest(userId, questId, tx);
      }
      const party = await tx.party.create({
        data: { title, capacity, joinPolicy, questId, leaderId: userId, members: { create: { userId } } },
      });
      await this.endWaiting(userId, tx);
      return this.audienceOf(party, tx);
    });
    this.signals.send(audience, 'party-changed');
    return this.read(userId);
  }

  // A Holder of the Party's Quest enters any Party, and a Friend of a member an Open one. To anyone else the Party is
  // unknown.
  async join(userId: string, partyId: string): Promise<PartyDto> {
    const audience = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      const party = await this.lock(partyId, tx);
      await this.refuseMember(userId, tx);
      if (!(await this.holdsQuest(party, userId, tx))) {
        if (!(await this.isFriendOfMember(party, userId, tx))) {
          throw partyNotFound();
        }
        if (party.joinPolicy !== JoinPolicy.open) {
          throw conflict('PARTY_NOT_OPEN', 'Only a Holder of its Quest and a User its Leader admits enter this Party.');
        }
      }
      return this.admit(party, userId, tx);
    });
    this.signals.send(audience, 'party-changed');
    return this.read(userId);
  }

  async leave(userId: string): Promise<void> {
    const audience = await this.visibility.announceRemovals(userId, () =>
      this.prisma.$transaction(async (tx) => {
        await this.users.lock(userId, tx);
        const membership = await tx.partyMember.findUnique({ where: { userId } });
        if (membership === null) {
          throw notInParty();
        }
        return this.removeMember(await this.lock(membership.partyId, tx), userId, tx);
      }),
    );
    this.signals.send(audience, 'party-changed');
  }

  // The User's switch for Location Sharing with their Party.
  async setSharing(userId: string, on: boolean): Promise<void> {
    await this.visibility.announceRemovals(userId, async () => {
      const { count } = await this.prisma.partyMember.updateMany({ where: { userId }, data: { sharing: on } });
      if (count === 0) {
        throw notInParty();
      }
    });
  }

  async read(userId: string): Promise<PartyDto> {
    const membership = await this.prisma.partyMember.findUnique({
      where: { userId },
      include: { party: { include: PARTY_INCLUDE } },
    });
    if (membership === null) {
      throw notInParty();
    }
    return toPartyDto(membership.party, userId, new Set((await this.visibility.visibleTo(userId)).keys()));
  }

  // The Parties the User can see and is not in: those of the Quests the User holds and those the User's Friends are
  // in, the newest first.
  async listVisible(userId: string): Promise<VisiblePartyDto[]> {
    const friendIds = await this.friends.friendsOfAny([userId]);
    const friends = new Set(friendIds);
    const parties = await this.prisma.party.findMany({
      where: {
        members: { none: { userId } },
        OR: [{ quest: { holders: { some: { userId } } } }, { members: { some: { userId: { in: friendIds } } } }],
      },
      include: visiblePartyInclude(userId),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return parties.map((party) => toVisiblePartyDto(party, friends));
  }

  // Adds the User to the Party within its capacity, and ends the User's requests to enter and invitations. Every way
  // into a Party ends here, after the User and then the Party were locked. Answers the Users to send `party-changed` to
  // once the transaction commits.
  async admit(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    await this.refuseMember(userId, tx);
    if ((await this.memberIds(party, tx)).length >= party.capacity) {
      throw conflict('PARTY_FULL', 'This Party is full.');
    }
    await tx.partyMember.create({ data: { partyId: party.id, userId } });
    await this.endWaiting(userId, tx);
    return this.audienceOf(party, tx);
  }

  // Takes the User out of the Party, by QuestParty's rule, which a Quest's removal of a Holder follows too. Every way
  // out ends there, after the User and then the Party were locked; wrap the transaction in
  // VisibilityService.announceRemovals for the User. Answers the Users to send `party-changed` to once the transaction
  // commits, the User included.
  removeMember(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    return this.questParty.removeMember(party, userId, tx);
  }

  // Who is told of a change to the Party: its members, the Holders of its Quest and the Friends of its members.
  audienceOf(party: Pick<Party, 'id' | 'questId'>, tx: Prisma.TransactionClient): Promise<string[]> {
    return this.questParty.audienceOf(party, tx);
  }

  // Locks the Party's row until the transaction ends and reads it.
  async lock(partyId: string, tx: Prisma.TransactionClient): Promise<Party> {
    await tx.$queryRaw`SELECT 1 FROM parties WHERE id = ${partyId}::uuid FOR NO KEY UPDATE`;
    const party = await tx.party.findUnique({ where: { id: partyId } });
    if (party === null) {
      throw partyNotFound();
    }
    return party;
  }

  // In the order they entered.
  memberIds(party: Pick<Party, 'id'>, tx: Prisma.TransactionClient): Promise<string[]> {
    return this.questParty.memberIds(party, tx);
  }

  // A User who enters any Party has no request to enter and no invitation waiting any more.
  private async endWaiting(userId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.partyJoinRequest.deleteMany({ where: { userId } });
    await tx.partyInvitation.deleteMany({ where: { userId } });
  }

  private async refuseMember(userId: string, tx: Prisma.TransactionClient): Promise<void> {
    if ((await tx.partyMember.findUnique({ where: { userId } })) !== null) {
      throw conflict('ALREADY_IN_PARTY', 'The User is in a Party already.');
    }
  }

  // The Party's Quest is a stored Quest the opener holds, with Sub Quests ahead, that no running Party has and that was
  // not taken alone, as a Party shows it to Friends. The Quest is locked, so that two Holders opening a Party for it run
  // one after the other.
  private async checkQuest(userId: string, questId: string, tx: Prisma.TransactionClient): Promise<void> {
    await this.quests.lock(questId, tx);
    if (!(await this.quests.holderIds(questId, tx)).includes(userId)) {
      throw questNotFound();
    }
    if ((await tx.quest.findUnique({ where: { id: questId } }))?.takenAlone === true) {
      throw takenAloneRefused();
    }
    if ((await this.quests.withSubQuestsAhead([questId], tx)).length === 0) {
      throw conflict('QUEST_ENDED', 'This Quest has no Sub Quest ahead.');
    }
    const running = await tx.party.findUnique({ where: { questId } });
    if (running !== null) {
      throw conflict('PARTY_EXISTS_FOR_QUEST', 'A running Party has this Quest.', { partyId: running.id });
    }
  }

  // Whether the User may see the Party: a Holder of its Quest or a Friend of a member. To anyone else it is unknown.
  async canSee(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<boolean> {
    return (await this.holdsQuest(party, userId, tx)) || this.isFriendOfMember(party, userId, tx);
  }

  async holdsQuest(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<boolean> {
    return party.questId !== null && (await this.quests.holderIds(party.questId, tx)).includes(userId);
  }

  private async isFriendOfMember(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<boolean> {
    return (await this.friends.friendsOfAny(await this.memberIds(party, tx), tx)).includes(userId);
  }
}
