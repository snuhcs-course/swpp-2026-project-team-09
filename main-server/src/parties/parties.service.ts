import { ConflictException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { Party, PartyJoinPolicy, Prisma } from '../generated/prisma/client.js';
import { VisibilityService } from '../location-sharing/visibility.service.js';
import { QuestsService } from '../quests/quests.service.js';
import { questNotFound } from '../quests/refusals.js';
import { UsersService } from '../users/users.service.js';
import { type CreatePartyDto } from './dto/party-requests.dto.js';
import {
  LISTED_PARTY_INCLUDE,
  ListedPartyDto,
  PARTY_INCLUDE,
  PartyDto,
  toListedPartyDto,
  toPartyDto,
} from './dto/party.dto.js';

const notInParty = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'NOT_IN_PARTY',
    message: 'The User is in no Party.',
  });

const conflict = (code: string, message: string, more: object = {}): ConflictException =>
  new ConflictException({ statusCode: HttpStatus.CONFLICT, error: 'Conflict', code, message, ...more });

// Who enters a Party, how the Join Policy admits them, and who leaves. Every change to a Party's membership locks the
// User first and then the Party, so that changes to one Party, and those of one User, run one after another.
@Injectable()
export class PartiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly quests: QuestsService,
    private readonly signals: SignalsService,
    private readonly visibility: VisibilityService,
  ) {}

  async create(userId: string, { title, capacity, joinPolicy, questId }: CreatePartyDto): Promise<PartyDto> {
    await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      await this.refuseMember(userId, tx);
      if (questId !== null) {
        await this.checkMark(userId, questId, tx);
      }
      await tx.party.create({
        data: { title, capacity, joinPolicy, questId, leaderId: userId, members: { create: { userId } } },
      });
    });
    this.signals.send([userId], 'party-changed');
    return this.read(userId);
  }

  // An Open Party admits anyone, and any Party admits a Holder of its mark.
  async join(userId: string, partyId: string): Promise<PartyDto> {
    const { memberIds, holderIds } = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      const party = await this.lock(partyId, tx);
      if (party.joinPolicy !== PartyJoinPolicy.open && !(await this.holdsMark(party, userId, tx))) {
        throw conflict('PARTY_NOT_OPEN', 'This Party is not Open, and the User holds no Quest it is marked with.');
      }
      return this.admit(party, userId, tx);
    });
    this.signals.send(memberIds, 'party-changed');
    this.signals.send(holderIds, 'quests-changed');
    return this.read(userId);
  }

  async leave(userId: string): Promise<void> {
    const memberIds = await this.visibility.announceRemovals(userId, () =>
      this.prisma.$transaction(async (tx) => {
        await this.users.lock(userId, tx);
        const membership = await tx.partyMember.findUnique({ where: { userId } });
        if (membership === null) {
          throw notInParty();
        }
        return this.removeMember(await this.lock(membership.partyId, tx), userId, tx);
      }),
    );
    this.signals.send(memberIds, 'party-changed');
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

  // The Open and Approval Parties, the newest first. For a Global Event, those marked with a Quest of it while the
  // Quest has Sub Quests ahead.
  async list(globalEventId: string | undefined): Promise<ListedPartyDto[]> {
    const parties = await this.prisma.party.findMany({
      where: {
        joinPolicy: { in: [PartyJoinPolicy.open, PartyJoinPolicy.approval] },
        ...(globalEventId === undefined ? {} : { quest: { globalEventId } }),
      },
      include: LISTED_PARTY_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    if (globalEventId === undefined) {
      return parties.map((party) => toListedPartyDto(party));
    }
    const ahead = new Set(await this.quests.withSubQuestsAhead(parties.flatMap(({ questId }) => questId ?? [])));
    return parties
      .filter(({ questId }) => questId !== null && ahead.has(questId))
      .map((party) => toListedPartyDto(party));
  }

  // Adds the User to the Party within its capacity, and makes the User a Holder of its mark. Every way into a Party
  // ends here, after the User and then the Party were locked. Answers the members to tell of the change, and the
  // Holders to tell of the Quest, none when the User did not become a Holder.
  async admit(
    party: Party,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ memberIds: string[]; holderIds: string[] }> {
    await this.refuseMember(userId, tx);
    const members = await tx.partyMember.findMany({ where: { partyId: party.id }, select: { userId: true } });
    if (members.length >= party.capacity) {
      throw conflict('PARTY_FULL', 'This Party is full.');
    }
    await tx.partyMember.create({ data: { partyId: party.id, userId } });
    return {
      memberIds: [...members.map((member) => member.userId), userId],
      holderIds: await this.gainMark(party, userId, tx),
    };
  }

  // Takes the User out of the Party. When the Leader goes, the member who joined earliest becomes Leader, and the Party
  // ends with its last member. Every way out ends here, after the User and then the Party were locked; wrap the
  // transaction in VisibilityService.announceRemovals for the User. Quests stay as they are. Answers the members before
  // the change, the User included, to tell of it.
  async removeMember(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    const members = await tx.partyMember.findMany({
      where: { partyId: party.id },
      orderBy: PARTY_INCLUDE.members.orderBy,
    });
    await tx.partyMember.delete({ where: { userId } });
    const earliest = members.find((member) => member.userId !== userId);
    if (earliest === undefined) {
      await tx.party.delete({ where: { id: party.id } });
    } else if (party.leaderId === userId) {
      await tx.party.update({ where: { id: party.id }, data: { leaderId: earliest.userId } });
    }
    return members.map((member) => member.userId);
  }

  // Locks the Party's row until the transaction ends and reads it.
  private async lock(partyId: string, tx: Prisma.TransactionClient): Promise<Party> {
    await tx.$queryRaw`SELECT 1 FROM parties WHERE id = ${partyId}::uuid FOR NO KEY UPDATE`;
    const party = await tx.party.findUnique({ where: { id: partyId } });
    if (party === null) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        code: 'PARTY_NOT_FOUND',
        message: 'No such Party is running.',
      });
    }
    return party;
  }

  private async refuseMember(userId: string, tx: Prisma.TransactionClient): Promise<void> {
    if ((await tx.partyMember.findUnique({ where: { userId } })) !== null) {
      throw conflict('ALREADY_IN_PARTY', 'The User is in a Party already.');
    }
  }

  // The mark is a stored Quest the creator holds, with Sub Quests ahead, that no running Party carries. The Quest is
  // locked, so that two Holders creating a Party for it run one after the other.
  private async checkMark(userId: string, questId: string, tx: Prisma.TransactionClient): Promise<void> {
    await this.quests.lock(questId, tx);
    if (!(await this.quests.holderIds(questId, tx)).includes(userId)) {
      throw questNotFound();
    }
    if ((await this.quests.withSubQuestsAhead([questId], tx)).length === 0) {
      throw conflict('QUEST_ENDED', 'This Quest has no Sub Quest ahead.');
    }
    const running = await tx.party.findUnique({ where: { questId } });
    if (running !== null) {
      throw conflict('PARTY_EXISTS_FOR_QUEST', 'A running Party carries this Quest.', { partyId: running.id });
    }
  }

  private async holdsMark(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<boolean> {
    return party.questId !== null && (await this.quests.holderIds(party.questId, tx)).includes(userId);
  }

  // A User who enters a marked Party without holding its Quest becomes a Holder of it, unless the User holds a Shared
  // Quest for the same Global Event. Answers the Holders after the change, or none when the User did not become one.
  private async gainMark(party: Party, userId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    if (party.questId === null) {
      return [];
    }
    await this.quests.lock(party.questId, tx);
    const holderIds = await this.quests.holderIds(party.questId, tx);
    if (holderIds.includes(userId)) {
      return [];
    }
    const { globalEventId } = await tx.quest.findUniqueOrThrow({ where: { id: party.questId } });
    if (globalEventId !== null && !(await this.quests.freeForSharedQuest(userId, globalEventId, tx))) {
      return [];
    }
    await tx.questHolder.create({ data: { questId: party.questId, userId, globalEventId } });
    return [...holderIds, userId];
  }
}
