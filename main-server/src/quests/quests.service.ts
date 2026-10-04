import { ConflictException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { GlobalEvent, GlobalEventState, Prisma, QuestHolder, SubQuest } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import { ClassQuestsService } from './class-quests.service.js';
import { CLOCK, type Clock } from './clock.js';
import { type SubQuestContentDto } from './dto/quest-requests.dto.js';
import { QUEST_INCLUDE, QuestDto, SUB_QUEST_INCLUDE, SubQuestDto, toQuestDto, toSubQuestDto } from './dto/quest.dto.js';

const questNotFound = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'QUEST_NOT_FOUND',
    message: 'This User holds no such Quest.',
  });

const subQuestNotFound = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'SUB_QUEST_NOT_FOUND',
    message: 'This Quest has no such Sub Quest.',
  });

@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly signals: SignalsService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly classQuests: ClassQuestsService,
  ) {}

  // The User's Quest for the Global Event, made the first time. The User's row is locked first, so that two attempts
  // at the same moment run one after the other and the later finds the Quest of the earlier.
  async attend(userId: string, globalEventId: string): Promise<QuestDto> {
    const { questId, created } = await this.prisma.$transaction(async (tx) => {
      const globalEvent = await tx.globalEvent.findFirst({
        where: { id: globalEventId, state: GlobalEventState.published },
      });
      if (globalEvent === null) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          code: 'GLOBAL_EVENT_NOT_FOUND',
          message: 'No such Global Event is published.',
        });
      }
      await this.users.lock(userId, tx);
      const held = await this.heldFor(userId, globalEventId, tx);
      if (held !== null) {
        return { questId: held, created: false };
      }
      return { questId: await this.createForGlobalEvent(globalEvent, [userId], tx), created: true };
    });
    if (created) {
      this.signals.send([userId], 'quests-changed');
    }
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
    if (quest === null) {
      throw questNotFound();
    }
    return toQuestDto(quest, userId, this.clock.now());
  }

  async drop(userId: string, questId: string): Promise<void> {
    await this.classQuests.refuseChange(userId, questId);
    await this.changeShared(userId, questId, (tx) => this.removeHolder(questId, userId, tx));
  }

  async addSubQuest(userId: string, questId: string, content: SubQuestContentDto): Promise<SubQuestDto> {
    await this.classQuests.refuseChange(userId, questId);
    return this.changeShared(userId, questId, async (tx) => {
      const subQuest = await tx.subQuest.create({
        data: { questId, ...(await this.columnsOf(content, tx)) },
        include: SUB_QUEST_INCLUDE,
      });
      return toSubQuestDto(subQuest, null, userId, this.clock.now());
    });
  }

  editSubQuest(userId: string, questId: string, subQuestId: string, content: SubQuestContentDto): Promise<SubQuestDto> {
    return this.changeShared(userId, questId, async (tx) => {
      await this.addedSubQuest(questId, subQuestId, tx);
      const subQuest = await tx.subQuest.update({
        where: { id: subQuestId },
        data: await this.columnsOf(content, tx),
        include: SUB_QUEST_INCLUDE,
      });
      return toSubQuestDto(subQuest, null, userId, this.clock.now());
    });
  }

  async cancelSubQuest(userId: string, questId: string, subQuestId: string): Promise<void> {
    await this.changeShared(userId, questId, async (tx) => {
      await this.addedSubQuest(questId, subQuestId, tx);
      if ((await tx.subQuest.count({ where: { questId } })) === 1) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          code: 'LAST_SUB_QUEST',
          message: 'The only Sub Quest of a Quest cannot be cancelled.',
        });
      }
      await tx.subQuest.delete({ where: { id: subQuestId } });
    });
  }

  // The mark is the Holder's own, so no other Holder is told.
  async markDone(userId: string, questId: string, subQuestId: string): Promise<void> {
    await this.inQuest(userId, questId, async (tx, holder) => {
      if ((await tx.subQuest.findFirst({ where: { id: subQuestId, questId } })) === null) {
        throw subQuestNotFound();
      }
      await tx.subQuestProgress.createMany({ data: { subQuestId, holderId: holder.id }, skipDuplicates: true });
    });
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

  // A Quest for the Global Event, with its title, the Holders and the Sub Quest for attending it. Each Holder must hold
  // no Quest for it yet, or the unique index on the Holders refuses it.
  async createForGlobalEvent(
    globalEvent: Pick<GlobalEvent, 'id' | 'title'>,
    holderIds: readonly string[],
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const quest = await tx.quest.create({
      data: {
        title: globalEvent.title,
        globalEventId: globalEvent.id,
        holders: { create: holderIds.map((userId) => ({ userId, globalEventId: globalEvent.id })) },
        subQuests: { create: { attending: true } },
      },
    });
    return quest.id;
  }

  // Removes the Holder with the Holder's progress, and the Quest with its Sub Quests when nobody holds it any more.
  // Lock the Quest first.
  async removeHolder(questId: string, userId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.questHolder.delete({ where: { questId_userId: { questId, userId } } });
    if ((await tx.questHolder.count({ where: { questId } })) === 0) {
      await tx.quest.delete({ where: { id: questId } });
    }
  }

  async holderIds(questId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    const holders = await tx.questHolder.findMany({ where: { questId }, select: { userId: true } });
    return holders.map(({ userId }) => userId);
  }

  private async holderIn(questId: string, userId: string, tx: Prisma.TransactionClient): Promise<QuestHolder> {
    const holder = await tx.questHolder.findUnique({ where: { questId_userId: { questId, userId } } });
    if (holder === null) {
      throw questNotFound();
    }
    return holder;
  }

  // A Sub Quest of the Quest that a Holder added, which a Holder may edit or cancel.
  private async addedSubQuest(questId: string, subQuestId: string, tx: Prisma.TransactionClient): Promise<SubQuest> {
    const subQuest = await tx.subQuest.findFirst({ where: { id: subQuestId, questId } });
    if (subQuest === null) {
      throw subQuestNotFound();
    }
    if (subQuest.attending) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        code: 'ATTENDING_SUB_QUEST',
        message: 'The Sub Quest for attending follows its Global Event and cannot be edited or cancelled.',
      });
    }
    return subQuest;
  }

  private async columnsOf(
    { title, startsAt, endsAt, place }: SubQuestContentDto,
    tx: Prisma.TransactionClient,
  ): Promise<Pick<SubQuest, 'title' | 'startsAt' | 'endsAt' | 'placeId' | 'latitude' | 'longitude' | 'placeLabel'>> {
    const point = place !== null && 'latitude' in place ? place : null;
    const placeId = place !== null && 'placeId' in place ? place.placeId : null;
    if (placeId !== null && (await tx.place.findUnique({ where: { id: placeId } })) === null) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        code: 'PLACE_NOT_FOUND',
        message: 'No such Place is in the list.',
      });
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
  private inQuest<T>(
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
  private async changeShared<T>(
    userId: string,
    questId: string,
    change: (tx: Prisma.TransactionClient, holder: QuestHolder) => Promise<T>,
  ): Promise<T> {
    const { result, holderIds } = await this.inQuest(userId, questId, change);
    this.signals.send(holderIds, 'quests-changed');
    return result;
  }
}
