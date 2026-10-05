import { ConflictException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { JoinPolicy, Party, Prisma } from '../generated/prisma/client.js';
import { VisibilityService } from '../location-sharing/visibility.service.js';
import { QuestsService } from '../quests/quests.service.js';
import { questNotFound } from '../quests/refusals.js';
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

const notInParty = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'NOT_IN_PARTY',
    message: 'The User is in no Party.',
  });

// Also for a Party the User may not see, so that its existence stays hidden.
const partyNotFound = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'PARTY_NOT_FOUND',
    message: 'No such Party is running.',
  });

const conflict = (code: string, message: string, more: object = {}): ConflictException =>
  new ConflictException({ statusCode: HttpStatus.CONFLICT, error: 'Conflict', code, message, ...more });

// Who opens, enters and leaves a Party. Every change to a Party's membership locks the User first and then the Party,
// so that changes to one Party, and those of one User, run one after another. Entering or leaving changes no Quest.
@Injectable()
export class PartiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly quests: QuestsService,
    private readonly friends: FriendsService,
    private readonly signals: SignalsService,
    private readonly visibility: VisibilityService,
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
        if (!(await this.friends.friendsOfAny(await this.memberIds(party, tx), tx)).includes(userId)) {
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
    return toPartyDto(membership.party, userId, new Set(await this.visibility.visibleTo(userId)));
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

  // Adds the User to the Party within its capacity. Every way into a Party ends here, after the User and then the Party
  // were locked. Answers the Users to send `party-changed` to once the transaction commits.
  async admit(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    await this.refuseMember(userId, tx);
    if ((await this.memberIds(party, tx)).length >= party.capacity) {
      throw conflict('PARTY_FULL', 'This Party is full.');
    }
    await tx.partyMember.create({ data: { partyId: party.id, userId } });
    return this.audienceOf(party, tx);
  }

  // Takes the User out of the Party. When the Leader goes, the member who entered earliest becomes Leader, and the
  // Party ends with its last member. Every way out ends here, after the User and then the Party were locked; wrap the
  // transaction in VisibilityService.announceRemovals for the User. Answers the Users to send `party-changed` to once
  // the transaction commits, the User included.
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
    const holderIds = party.questId === null ? [] : await this.quests.holderIds(party.questId, tx);
    return [...new Set([...memberIds, ...holderIds, ...(await this.friends.friendsOfAny(memberIds, tx))])];
  }

  // Locks the Party's row until the transaction ends and reads it.
  private async lock(partyId: string, tx: Prisma.TransactionClient): Promise<Party> {
    await tx.$queryRaw`SELECT 1 FROM parties WHERE id = ${partyId}::uuid FOR NO KEY UPDATE`;
    const party = await tx.party.findUnique({ where: { id: partyId } });
    if (party === null) {
      throw partyNotFound();
    }
    return party;
  }

  // In the order they entered.
  private async memberIds(party: Pick<Party, 'id'>, tx: Prisma.TransactionClient): Promise<string[]> {
    const members = await tx.partyMember.findMany({
      where: { partyId: party.id },
      select: { userId: true },
      orderBy: PARTY_INCLUDE.members.orderBy,
    });
    return members.map((member) => member.userId);
  }

  private async refuseMember(userId: string, tx: Prisma.TransactionClient): Promise<void> {
    if ((await tx.partyMember.findUnique({ where: { userId } })) !== null) {
      throw conflict('ALREADY_IN_PARTY', 'The User is in a Party already.');
    }
  }

  // The Party's Quest is a stored Quest the opener holds, with Sub Quests ahead, that no running Party has. The Quest is
  // locked, so that two Holders opening a Party for it run one after the other.
  private async checkQuest(userId: string, questId: string, tx: Prisma.TransactionClient): Promise<void> {
    await this.quests.lock(questId, tx);
    if (!(await this.quests.holderIds(questId, tx)).includes(userId)) {
      throw questNotFound();
    }
    if ((await this.quests.withSubQuestsAhead([questId], tx)).length === 0) {
      throw conflict('QUEST_ENDED', 'This Quest has no Sub Quest ahead.');
    }
    const running = await tx.party.findUnique({ where: { questId } });
    if (running !== null) {
      throw conflict('PARTY_EXISTS_FOR_QUEST', 'A running Party has this Quest.', { partyId: running.id });
    }
  }

  private async holdsQuest(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<boolean> {
    return party.questId !== null && (await this.quests.holderIds(party.questId, tx)).includes(userId);
  }
}
