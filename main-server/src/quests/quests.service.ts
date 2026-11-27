/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-05  Fable 5.1  prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-20  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import {
  GlobalEvent,
  GlobalEventState,
  JoinPolicy,
  type Meal,
  Prisma,
  QuestBoard,
  QuestHolder,
  SubQuest,
} from '../generated/prisma/client.js';
import { RoomRequestSync } from '../library/room-request-sync.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { partyMade, UsageService } from '../usage/usage.service.js';
import { UsersService } from '../users/users.service.js';
import { ClassQuestsService } from './class-quests.service.js';
import { CLOCK, type Clock } from './clock.js';
import { type MakeQuestDto } from './dto/quest-requests.dto.js';
import {
  hasSubQuestsAhead,
  QUEST_INCLUDE,
  QuestDto,
  type SubQuestContent,
  subQuestContentsOf,
  toQuestDto,
} from './dto/quest.dto.js';
import { questRoomsOf } from './quest-room-requests.js';
import { notFound, questNotFound } from './refusals.js';
import { columnsOf } from './sub-quest-columns.js';
import { forgetLeaveBy, gatheringFrom } from './taken-alone.js';
import { inOrder } from './sub-quest-order.js';

// What a Sub Quest that a Holder writes stores.
export type SubQuestColumns = Pick<
  SubQuest,
  'startsAt' | 'endsAt' | 'placeId' | 'latitude' | 'longitude' | 'placeLabel'
> & {
  title: string;
};

// The capacity of a Quest taken alone (`takenAlone`), so that no one else enters it.
export const ALONE_CAPACITY = 1;

// How a new Quest starts. Left out, its first Holder leads it, and it is Closed with capacity 4, no board and an empty
// description.
export interface QuestSettings {
  leaderId?: string;
  capacity?: number;
  joinPolicy?: JoinPolicy;
  board?: QuestBoard;
  description?: string;
  // A Quest taken alone: never a 파티, so it is in no list or count of parties.
  takenAlone?: boolean;
  // A seat's stay at 관정관, which is no busy time (`heldSubQuests`).
  seatStay?: boolean;
  // The meal of a Quest made from a meal's Plan (`heldMealOf`).
  meal?: Meal;
  // A Quest made from a meeting's Plan.
  meet?: boolean;
}

@Injectable()
export class QuestsService {
  private readonly logger = new Logger(QuestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly signals: SignalsService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly classQuests: ClassQuestsService,
    private readonly roomRequests: RoomRequestSync,
    private readonly notifications: NotificationsService,
    private readonly usage: UsageService,
  ) {}

  // The User's Quest for the Global Event, made the first time, with the title given or else the event's. The User's
  // row is locked first, so that two attempts at the same moment run one after the other and the later finds the Quest
  // of the earlier, whose title stays. A Quest the User took alone for it, which the party form reaches here, gathers
  // others from now on: it is no longer taken alone, takes the usual capacity, and its leave-by goes.
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
        return { questId: held, created: await gatheringFrom(held, tx) };
      }
      return { questId: await this.createForGlobalEvent(globalEvent, [userId], tx, { title }), created: true };
    });
    if (created) {
      await forgetLeaveBy(this.notifications, this.logger, { userId, questId });
      this.signals.send([userId], 'quests-changed');
    }
    // A 파티 made: a new Quest, or one the User took alone that gathers others from now on.
    return created ? partyMade(this.usage, userId, await this.read(userId, questId)) : this.read(userId, questId);
  }

  // A Quest of the User's own, without a Global Event.
  async make(userId: string, { subQuest, ...settings }: MakeQuestDto): Promise<QuestDto> {
    const questId = await this.prisma.$transaction(async (tx) =>
      this.createWithSubQuest(await columnsOf(subQuest, tx), [userId], tx, settings),
    );
    this.signals.send([userId], 'quests-changed');
    return partyMade(this.usage, userId, await this.read(userId, questId));
  }

  // The stored Quests, then today's Class Quests. Leaves out the Quests whose Sub Quests are all cancelled or past
  // their end; a mark of done does not count.
  async list(userId: string): Promise<QuestDto[]> {
    const quests = await this.prisma.quest.findMany({
      where: { holders: { some: { userId } } },
      include: QUEST_INCLUDE,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const now = this.clock.now();
    const roomsOf = await questRoomsOf(this.prisma, quests);
    return [
      ...quests.map((quest) => toQuestDto(quest, userId, now, roomsOf(quest.id))),
      ...(await this.classQuests.todayFor(userId, now)),
    ].filter(({ subQuests }) => subQuests.some(({ ended }) => !ended));
  }

  // Every Sub Quest of the stored Quests the User holds, whether it passed or not, but a seat's stay, which is no busy
  // time: the User still eats, meets and goes out from a seat, so no planner reads it.
  async heldSubQuests(userId: string): Promise<SubQuestContent[]> {
    const quests = await this.prisma.quest.findMany({
      where: { holders: { some: { userId } }, seatStay: false },
      include: QUEST_INCLUDE,
    });
    return quests.flatMap((quest) => subQuestContentsOf(quest));
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
    const roomsOf = await questRoomsOf(this.prisma, [quest]);
    return toQuestDto(quest, userId, now, roomsOf(quest.id));
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

  // The Holders of every Quest for the Global Event, or of every 파티 for it: `alone` false leaves out the Holders of a
  // Quest taken alone.
  async holderIdsFor(globalEventId: string, alone = true): Promise<string[]> {
    const party = alone ? {} : { quest: { takenAlone: false } };
    const holders = await this.prisma.questHolder.findMany({
      where: { globalEventId, ...party },
      select: { userId: true },
    });
    return holders.map(({ userId }) => userId);
  }

  // A Quest for the Global Event, with the Holders and the Sub Quest for attending it, then these steps in the order
  // given, titled as the event unless a title is given. The title is the Quest's own and does not follow later changes
  // to the event's. Each Holder must hold no Quest for it yet, or the unique index on the Holders refuses it. The
  // Holders enter in the order given.
  createForGlobalEvent(
    globalEvent: Pick<GlobalEvent, 'id' | 'title'>,
    holderIds: readonly string[],
    tx: Prisma.TransactionClient,
    {
      title = globalEvent.title,
      steps = [],
      ...settings
    }: QuestSettings & { title?: string; steps?: readonly SubQuestColumns[] } = {},
  ): Promise<string> {
    const subQuest = [{ attending: true }, ...inOrder(steps)];
    return this.create({ title, globalEventId: globalEvent.id, subQuest }, holderIds, settings, tx);
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

  // A Quest without a Global Event, with these Sub Quests in the order given and these Holders in the order given.
  createWithSubQuests(
    title: string,
    subQuests: readonly SubQuestColumns[],
    holderIds: readonly string[],
    tx: Prisma.TransactionClient,
    settings: QuestSettings = {},
  ): Promise<string> {
    return this.create({ title, globalEventId: null, subQuest: inOrder(subQuests) }, holderIds, settings, tx);
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
    await forgetLeaveBy(this.notifications, this.logger, { userId, questId });
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
      subQuest: Prisma.SubQuestCreateWithoutQuestInput | Prisma.SubQuestCreateWithoutQuestInput[];
    },
    holderIds: readonly string[],
    { leaderId = holderIds[0], ...settings }: QuestSettings,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const { title, globalEventId, subQuest } = quest;
    const { id } = await tx.quest.create({
      data: {
        title,
        globalEventId,
        leaderId,
        ...settings,
        holders: { create: holderIds.map((userId) => ({ userId, globalEventId })) },
        subQuests: { create: subQuest },
      },
    });
    return id;
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
