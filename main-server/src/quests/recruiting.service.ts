import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { JoinPolicy, Prisma, Quest, QuestBoard } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import { ClassQuestsService } from './class-quests.service.js';
import { CLOCK, type Clock } from './clock.js';
import { QUEST_INCLUDE, QuestDto, RecruitingQuestDto, toRecruitingQuestDto } from './dto/quest.dto.js';
import { QuestsService } from './quests.service.js';
import { alreadyHolder, conflict, notRecruiting, sharedQuestHeld } from './refusals.js';

// The list of recruiting Quests and every way into a Quest (README.md: Quests).
@Injectable()
export class RecruitingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly quests: QuestsService,
    private readonly signals: SignalsService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly classQuests: ClassQuestsService,
  ) {}

  // The Open and Approval Quests the reader does not hold that have a Sub Quest ahead, the newest first.
  async list(
    readerId: string,
    globalEventId: string | undefined,
    board: QuestBoard | undefined,
  ): Promise<RecruitingQuestDto[]> {
    const quests = await this.prisma.quest.findMany({
      where: {
        joinPolicy: { in: [JoinPolicy.open, JoinPolicy.approval] },
        globalEventId,
        board,
        holders: { none: { userId: readerId } },
      },
      include: QUEST_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const now = this.clock.now();
    return quests.flatMap((quest) => toRecruitingQuestDto(quest, now) ?? []);
  }

  // Joining an Open Quest, which makes the User a Holder at once.
  async join(userId: string, questId: string): Promise<QuestDto> {
    const holderIds = await this.prisma.$transaction((tx) =>
      this.enter(questId, userId, tx, ({ joinPolicy }) => {
        if (joinPolicy === JoinPolicy.closed) {
          throw notRecruiting();
        }
        if (joinPolicy === JoinPolicy.approval) {
          throw conflict('QUEST_NOT_OPEN', 'The Leader accepts each User who asks to join this Quest.');
        }
      }),
    );
    this.signals.send(holderIds, 'quests-changed');
    return this.quests.read(userId, questId);
  }

  // Makes the User a Holder of the Quest within its capacity and under the one-Quest rule for its Global Event: a Quest
  // the User held alone for the event is deleted, and a Shared Quest held for it refuses. Ends the User's request to
  // join the Quest and invitation into it. Every way into a Quest ends here; `admits` refuses whom that way does not
  // take, once the Quest is locked. Locks the User and then the Quests in the order of their ids, so lock no Quest
  // before. Answers the Holders to tell, the User included.
  async enter(
    questId: string,
    userId: string,
    tx: Prisma.TransactionClient,
    admits?: (quest: Quest) => void | Promise<void>,
  ): Promise<string[]> {
    await this.users.lock(userId, tx);
    const globalEventId = (await tx.quest.findUnique({ where: { id: questId } }))?.globalEventId ?? null;
    const held = globalEventId === null ? null : await this.quests.heldFor(userId, globalEventId, tx);
    // In one order for every entry, so that two entries never wait for each other.
    const [first = questId, second = questId] = [questId, held ?? questId].toSorted();
    await this.quests.lock(first, tx);
    await this.quests.lock(second, tx);
    const quest = await tx.quest.findUnique({ where: { id: questId }, include: { holders: true } });
    if (quest === null) {
      await this.classQuests.refuse(userId, questId, tx);
      throw notRecruiting();
    }
    if (quest.holders.some((holder) => holder.userId === userId)) {
      throw alreadyHolder();
    }
    await admits?.(quest);
    if ((await this.quests.withSubQuestsAhead([questId], tx)).length === 0) {
      throw conflict('QUEST_ENDED', 'This Quest has no Sub Quest ahead.');
    }
    if (quest.holders.length >= quest.capacity) {
      throw conflict('QUEST_FULL', 'This Quest is full.');
    }
    if (globalEventId !== null && !(await this.quests.freeForSharedQuest(userId, globalEventId, tx))) {
      throw sharedQuestHeld();
    }
    await tx.questHolder.create({ data: { questId, userId, globalEventId } });
    await tx.questJoinRequest.deleteMany({ where: { questId, userId } });
    await tx.questInvitation.deleteMany({ where: { questId, userId } });
    return [...quest.holders.map((holder) => holder.userId), userId];
  }
}
