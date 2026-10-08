import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import {
  GlobalEvent,
  GlobalEventState,
  JoinPolicy,
  Prisma,
  QuestBoard,
  QuestHolder,
  SubQuest,
} from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import { ClassQuestsService } from './class-quests.service.js';
import { CLOCK, type Clock } from './clock.js';
import { type MakeQuestDto, type SubQuestContentDto } from './dto/quest-requests.dto.js';
import { hasSubQuestsAhead, QUEST_INCLUDE, QuestDto, toQuestDto } from './dto/quest.dto.js';
import { notFound, questNotFound } from './refusals.js';

// What a Sub Quest that a Holder or a Meetup writes stores.
export type SubQuestColumns = Pick<
  SubQuest,
  'startsAt' | 'endsAt' | 'placeId' | 'latitude' | 'longitude' | 'placeLabel'
> & {
  title: string;
};

// How a new Quest starts. Left out, its first Holder leads it, and it is Closed with capacity 4, no board and an empty
// description.
export interface QuestSettings {
  leaderId?: string;
  capacity?: number;
  joinPolicy?: JoinPolicy;
  board?: QuestBoard;
  description?: string;
}

@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly signals: SignalsService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly classQuests: ClassQuestsService,
  ) {}

  // The User's Quest for the Global Event, made the first time, with the title given or else the event's. The User's
  // row is locked first, so that two attempts at the same moment run one after the other and the later finds the Quest
  // of the earlier, whose title stays.
  async attend(userId: string, globalEventId: string, title?: string): Promise<QuestDto> {
    const { questId, created } = await this.prisma.$transaction(async (tx) => {
      const globalEvent = await tx.globalEvent.findFirst({
        where: { id: globalEventId, state: GlobalEventState.published },
      });
      if (globalEvent === null) {
        throw notFound('GLOBAL_EVENT_NOT_FOUND', 'No such Global Event is published.');
      }
      await this.users.lock(userId, tx);
      const held = await this.heldFor(userId, globalEventId, tx);
      if (held !== null) {
        return { questId: held, created: false };
      }
      return { questId: await this.createForGlobalEvent(globalEvent, [userId], tx, { title }), created: true };
    });
    if (created) {
      this.signals.send([userId], 'quests-changed');
    }
    return this.read(userId, questId);
  }

  // A Quest of the User's own, without a Global Event.
  async make(userId: string, { subQuest, ...settings }: MakeQuestDto): Promise<QuestDto> {
    const questId = await this.prisma.$transaction(async (tx) =>
      this.createWithSubQuest(await this.columnsOf(subQuest, tx), [userId], tx, settings),
    );
    this.signals.send([userId], 'quests-changed');
    return this.read(userId, questId);
  }

  // The stored Quests, then today's Class Quests. Leaves out the Quests whose Sub Quests have all ended for the User.
  async list(userId: string): Promise<QuestDto[]> {
    const quests = await this.prisma.quest.findMany({
      where: { holders: { some: { userId } } },
      include: QUEST_INCLUDE,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const now = this.clock.now();
    return [
      ...quests.map((quest) => toQuestDto(quest, userId, now)),
      ...(await this.classQuests.todayFor(userId, now)),
    ].filter(({ subQuests }) => subQuests.some(({ ended }) => !ended));
  }

  async read(userId: string, questId: string): Promise<QuestDto> {
    const quest = await this.prisma.quest.findFirst({
      where: { id: questId, holders: { some: { userId } } },
      include: QUEST_INCLUDE,
    });
    const now = this.clock.now();
    if (quest === null) {
      const classQuest = await this.classQuests.todayOne(userId, questId, now);
      if (classQuest === null) {
        throw questNotFound();
      }
      return classQuest;
    }
    return toQuestDto(quest, userId, now);
  }

  async drop(userId: string, questId: string): Promise<void> {
    await this.changeShared(userId, questId, (tx) => this.removeHolder(questId, userId, tx));
  }

  // Locks the Quest's row until the transaction ends, so that changes to one Quest run one after another.
  async lock(questId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT 1 FROM quests WHERE id = ${questId}::uuid FOR NO KEY UPDATE`;
  }

  // The id of the Quest the User holds for the Global Event, if any.
  async heldFor(userId: string, globalEventId: string, tx: Prisma.TransactionClient): Promise<string | null> {
    const holder = await tx.questHolder.findFirst({ where: { userId, globalEventId } });
    return holder?.questId ?? null;
  }

  // The Holders of every Quest for the Global Event.
  async holderIdsFor(globalEventId: string): Promise<string[]> {
    const holders = await this.prisma.questHolder.findMany({ where: { globalEventId }, select: { userId: true } });
    return holders.map(({ userId }) => userId);
  }

  // A Quest for the Global Event, with the Holders and the Sub Quest for attending it, titled as the event unless a
  // title is given. The title is the Quest's own and does not follow later changes to the event's. Each Holder must hold
  // no Quest for it yet, or the unique index on the Holders refuses it. The Holders enter in the order given. A match's
  // Quest names the match, once.
  createForGlobalEvent(
    globalEvent: Pick<GlobalEvent, 'id' | 'title'>,
    holderIds: readonly string[],
    tx: Prisma.TransactionClient,
    { matchId, title = globalEvent.title, ...settings }: QuestSettings & { matchId?: string; title?: string } = {},
  ): Promise<string> {
    return this.create(
      { title, globalEventId: globalEvent.id, matchId, subQuest: { attending: true } },
      holderIds,
      settings,
      tx,
    );
  }

  // A Quest without a Global Event, titled as its one Sub Quest unless a title is given, with these Holders in the order
  // given.
  createWithSubQuest(
    subQuest: SubQuestColumns,
    holderIds: readonly string[],
    tx: Prisma.TransactionClient,
    { title = subQuest.title, ...settings }: QuestSettings & { title?: string } = {},
  ): Promise<string> {
    return this.create({ title, globalEventId: null, subQuest }, holderIds, settings, tx);
  }

  // Removes the Holder with the Holder's progress, and the Quest with its Sub Quests when nobody holds it any more.
  // When the Leader goes, the Holder who entered earliest leads. Lock the Quest first.
  async removeHolder(questId: string, userId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.questHolder.delete({ where: { questId_userId: { questId, userId } } });
    const [earliest] = await this.holderIds(questId, tx);
    if (earliest === undefined) {
      await tx.quest.delete({ where: { id: questId } });
    } else {
      await tx.quest.updateMany({ where: { id: questId, leaderId: userId }, data: { leaderId: earliest } });
    }
  }

  // In the order they entered.
  async holderIds(questId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    const holders = await tx.questHolder.findMany({
      where: { questId },
      select: { userId: true },
      orderBy: QUEST_INCLUDE.holders.orderBy,
    });
    return holders.map(({ userId }) => userId);
  }

  // Whether the User may become a Holder of a Shared Quest for the Global Event: yes when the User holds no Quest for
  // it, or holds one alone, which this deletes with its Sub Quests and the User's progress; no when the User holds a
  // Shared Quest for it, which stays.
  async freeForSharedQuest(userId: string, globalEventId: string, tx: Prisma.TransactionClient): Promise<boolean> {
    const questId = await this.heldFor(userId, globalEventId, tx);
    if (questId === null) {
      return true;
    }
    await this.lock(questId, tx);
    const holderIds = await this.holderIds(questId, tx);
    // Dropped while the lock was waited for: nothing holds the User back.
    if (!holderIds.includes(userId)) {
      return true;
    }
    if (holderIds.length > 1) {
      return false;
    }
    await this.removeHolder(questId, userId, tx);
    return true;
  }

  // Whether the User holds a Shared Quest for the Global Event, read without a lock: entering checks it again.
  async holdsSharedQuestFor(userId: string, globalEventId: string, tx: Prisma.TransactionClient): Promise<boolean> {
    const questId = await this.heldFor(userId, globalEventId, tx);
    return questId !== null && (await this.holderIds(questId, tx)).length > 1;
  }

  // The Quests among these that have a Sub Quest ahead: one not cancelled whose end time has not passed. A mark of done
  // is one Holder's own and does not count.
  async withSubQuestsAhead(questIds: readonly string[], tx: Prisma.TransactionClient = this.prisma): Promise<string[]> {
    const quests = await tx.quest.findMany({ where: { id: { in: [...questIds] } }, include: QUEST_INCLUDE });
    const now = this.clock.now();
    return quests.filter((quest) => hasSubQuestsAhead(quest, now)).map(({ id }) => id);
  }

  private async holderIn(questId: string, userId: string, tx: Prisma.TransactionClient): Promise<QuestHolder> {
    const holder = await tx.questHolder.findUnique({ where: { questId_userId: { questId, userId } } });
    if (holder === null) {
      await this.classQuests.refuse(userId, questId, tx);
      throw questNotFound();
    }
    return holder;
  }

  private async create(
    quest: {
      title: string;
      globalEventId: string | null;
      matchId?: string;
      subQuest: Prisma.SubQuestCreateWithoutQuestInput;
    },
    holderIds: readonly string[],
    { leaderId = holderIds[0], ...settings }: QuestSettings,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const { title, globalEventId, matchId, subQuest } = quest;
    const { id } = await tx.quest.create({
      data: {
        title,
        globalEventId,
        matchId,
        leaderId,
        ...settings,
        holders: { create: holderIds.map((userId) => ({ userId, globalEventId })) },
        subQuests: { create: subQuest },
      },
    });
    return id;
  }

  // Refuses a Place that is not in the list.
  async columnsOf(
    { title, startsAt, endsAt, place }: SubQuestContentDto,
    tx: Prisma.TransactionClient,
  ): Promise<SubQuestColumns> {
    const point = place !== null && 'latitude' in place ? place : null;
    const placeId = place !== null && 'placeId' in place ? place.placeId : null;
    if (placeId !== null && (await tx.place.findUnique({ where: { id: placeId } })) === null) {
      throw notFound('PLACE_NOT_FOUND', 'No such Place is in the list.');
    }
    return {
      title,
      startsAt: startsAt === null ? null : new Date(startsAt),
      endsAt: endsAt === null ? null : new Date(endsAt),
      placeId,
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
      placeLabel: point?.label ?? null,
    };
  }

  // Locks the Quest, checks that the User holds it and makes the change. Answers the change's result and the Holders
  // the Quest had before it.
  inQuest<T>(
    userId: string,
    questId: string,
    change: (tx: Prisma.TransactionClient, holder: QuestHolder) => Promise<T>,
  ): Promise<{ result: T; holderIds: string[] }> {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(questId, tx);
      const holder = await this.holderIn(questId, userId, tx);
      const holderIds = await this.holderIds(questId, tx);
      return { result: await change(tx, holder), holderIds };
    });
  }

  // As inQuest, and tells every Holder the Quest had, the User included.
  async changeShared<T>(
    userId: string,
    questId: string,
    change: (tx: Prisma.TransactionClient, holder: QuestHolder) => Promise<T>,
  ): Promise<T> {
    const { result, holderIds } = await this.inQuest(userId, questId, change);
    this.signals.send(holderIds, 'quests-changed');
    return result;
  }
}
