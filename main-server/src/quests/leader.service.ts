import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { JoinPolicy, Prisma, Quest } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import { ClassQuestsService } from './class-quests.service.js';
import { type UpdateQuestDto } from './dto/quest-requests.dto.js';
import { QuestDto } from './dto/quest.dto.js';
import { QuestsService } from './quests.service.js';
import { conflict, notFound, notLeader, questNotFound } from './refusals.js';

const notHolder = (): NotFoundException => notFound('NOT_QUEST_HOLDER', 'This User does not hold this Quest.');

// The Leader's controls, and the check that a User leads a Quest. A Leader's action on another User locks that User
// before the Quest, as entering does, and checks the Leader once the Quest is locked.
@Injectable()
export class LeaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly quests: QuestsService,
    private readonly signals: SignalsService,
    private readonly classQuests: ClassQuestsService,
  ) {}

  // Refuses unless the User holds and leads the Quest. Read without a lock, so that the Leader's actions are refused in
  // the same order whatever else they lock; confirm it with lockLed() inside the transaction.
  async ledBy(questId: string, userId: string, tx: Prisma.TransactionClient = this.prisma): Promise<Quest> {
    const quest = await tx.quest.findFirst({ where: { id: questId, holders: { some: { userId } } } });
    if (quest === null) {
      await this.classQuests.refuse(userId, questId, tx);
      throw questNotFound();
    }
    if (quest.leaderId !== userId) {
      throw notLeader();
    }
    return quest;
  }

  // Locks the Quest, and refuses unless the User still holds and leads it.
  async lockLed(questId: string, userId: string, tx: Prisma.TransactionClient): Promise<Quest> {
    await this.quests.lock(questId, tx);
    return this.ledBy(questId, userId, tx);
  }

  // A capacity below the number of Holders is refused, and so is a title for a Quest with a Global Event, which keeps
  // the event's. The Quest the changes lead to is on a board when it is Open or Approval, and on none when Closed: a
  // change to Closed clears the board.
  async update(userId: string, questId: string, changes: UpdateQuestDto): Promise<QuestDto> {
    await this.changeAsLeader(userId, questId, async (tx, quest, holderIds) => {
      if (changes.title !== undefined && quest.globalEventId !== null) {
        throw conflict('QUEST_TITLE_FROM_GLOBAL_EVENT', 'A Quest for a Global Event keeps the title of the event.');
      }
      if (changes.capacity !== undefined && changes.capacity < holderIds.length) {
        throw conflict('CAPACITY_BELOW_HOLDERS', 'The Quest has more Holders than this capacity.');
      }
      const closed = (changes.joinPolicy ?? quest.joinPolicy) === JoinPolicy.closed;
      if (closed && changes.board !== undefined) {
        throw conflict('BOARD_FOR_CLOSED_QUEST', 'A Closed Quest is on no board.');
      }
      if (!closed && (changes.board ?? quest.board) === null) {
        throw conflict('BOARD_REQUIRED', 'An Open or an Approval Quest is on a board.');
      }
      await tx.quest.update({ where: { id: questId }, data: closed ? { ...changes, board: null } : changes });
    });
    return this.quests.read(userId, questId);
  }

  // Ends the Quest for every Holder at once, as when its last Holder drops it: it is deleted with its Sub Quests, the
  // Holders' progress, its requests to join and its invitations. Tells the Holders and the Users who waited.
  async end(userId: string, questId: string): Promise<void> {
    const told = await this.prisma.$transaction(async (tx) => {
      await this.lockLed(questId, userId, tx);
      const { holders, joinRequests, invitations } = await tx.quest.delete({
        where: { id: questId },
        select: { holders: true, joinRequests: true, invitations: true },
      });
      return [...holders, ...joinRequests, ...invitations].map((one) => one.userId);
    });
    this.signals.send([...new Set(told)], 'quests-changed');
  }

  async handOver(userId: string, questId: string, newLeaderId: string): Promise<void> {
    await this.changeAsLeader(userId, questId, async (tx, _quest, holderIds) => {
      if (!holderIds.includes(newLeaderId)) {
        throw notHolder();
      }
      await tx.quest.update({ where: { id: questId }, data: { leaderId: newLeaderId } });
    });
  }

  // The Holder goes as one who dropped the Quest, with their progress. Nothing records the removal, so the User may
  // enter again.
  async remove(userId: string, questId: string, holderId: string): Promise<void> {
    await this.changeAsLeader(
      userId,
      questId,
      async (tx, _quest, holderIds) => {
        if (!holderIds.includes(holderId)) {
          throw notHolder();
        }
        await this.quests.removeHolder(questId, holderId, tx);
      },
      holderId,
    );
  }

  // Locks the User the change is about, if any, then the Quest, checks that the actor leads it and makes the change.
  // Tells every Holder the Quest had, a removed one included.
  private async changeAsLeader(
    userId: string,
    questId: string,
    change: (tx: Prisma.TransactionClient, quest: Quest, holderIds: string[]) => Promise<void>,
    otherUserId?: string,
  ): Promise<void> {
    const holderIds = await this.prisma.$transaction(async (tx) => {
      if (otherUserId !== undefined) {
        await this.users.lock(otherUserId, tx);
      }
      const quest = await this.lockLed(questId, userId, tx);
      const ids = await this.quests.holderIds(questId, tx);
      await change(tx, quest, ids);
      return ids;
    });
    this.signals.send(holderIds, 'quests-changed');
  }
}
