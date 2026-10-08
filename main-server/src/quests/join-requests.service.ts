import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { JoinPolicy, QuestJoinRequest } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import { ClassQuestsService } from './class-quests.service.js';
import {
  toWaitingDto,
  toWaitingUserDto,
  WAITING_INCLUDE,
  WAITING_USER_INCLUDE,
  WaitingDto,
  WaitingUserDto,
} from './dto/waiting.dto.js';
import { LeaderService } from './leader.service.js';
import { QuestsService } from './quests.service.js';
import { RecruitingService } from './recruiting.service.js';
import { alreadyHolder, conflict, notFound, notLeader, notRecruiting, sharedQuestHeld } from './refusals.js';

const joinRequestNotFound = (): NotFoundException =>
  notFound('QUEST_JOIN_REQUEST_NOT_FOUND', 'No such request to join waits for this answer from this User.');

// Requests to join an Approval Quest. A request waits until the User withdraws it or the Leader answers it, and ends
// with the Quest and when the User enters it in any way (RecruitingService.enter). Withdrawing and answering lock the
// User who asked first, so that one request gets one of them.
@Injectable()
export class JoinRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly quests: QuestsService,
    private readonly recruiting: RecruitingService,
    private readonly leader: LeaderService,
    private readonly signals: SignalsService,
    private readonly classQuests: ClassQuestsService,
  ) {}

  // A Closed Quest is answered as unknown, as joining it is. A User who holds the Quest alone for its Global Event may
  // ask, and loses that Quest on being accepted.
  async ask(userId: string, questId: string): Promise<WaitingDto> {
    const { request, leaderId } = await this.prisma.$transaction(async (tx) => {
      await this.quests.lock(questId, tx);
      const quest = await tx.quest.findUnique({ where: { id: questId }, include: { holders: true } });
      if (quest === null) {
        await this.classQuests.refuse(userId, questId, tx);
        throw notRecruiting();
      }
      if (quest.holders.some((holder) => holder.userId === userId)) {
        throw alreadyHolder();
      }
      if (quest.joinPolicy === JoinPolicy.closed) {
        throw notRecruiting();
      }
      if (quest.joinPolicy === JoinPolicy.open) {
        throw conflict('QUEST_NOT_APPROVAL', 'This Quest is Open: join it instead.');
      }
      if ((await tx.questJoinRequest.findUnique({ where: { questId_userId: { questId, userId } } })) !== null) {
        throw conflict('QUEST_JOIN_REQUEST_ALREADY_SENT', 'Your request to join this Quest is waiting.');
      }
      if (quest.globalEventId !== null && (await this.quests.holdsSharedQuestFor(userId, quest.globalEventId, tx))) {
        throw sharedQuestHeld();
      }
      return {
        request: await tx.questJoinRequest.create({ data: { questId, userId }, include: WAITING_INCLUDE }),
        leaderId: quest.leaderId,
      };
    });
    this.signals.send([leaderId], 'quests-changed');
    return toWaitingDto(request);
  }

  // The User's own waiting requests, the newest first.
  async listSent(userId: string): Promise<WaitingDto[]> {
    const requests = await this.prisma.questJoinRequest.findMany({
      where: { userId },
      include: WAITING_INCLUDE,
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    });
    return requests.map((request) => toWaitingDto(request));
  }

  async withdraw(userId: string, requestId: string): Promise<void> {
    const leaderId = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      const request = await tx.questJoinRequest.findFirst({
        where: { id: requestId, userId },
        include: { quest: true },
      });
      if (request === null || (await tx.questJoinRequest.deleteMany({ where: { id: requestId } })).count === 0) {
        throw joinRequestNotFound();
      }
      return request.quest.leaderId;
    });
    this.signals.send([leaderId], 'quests-changed');
  }

  // The requests to the Quest, the newest first.
  async listReceived(leaderId: string, questId: string): Promise<WaitingUserDto[]> {
    await this.leader.ledBy(questId, leaderId);
    const requests = await this.prisma.questJoinRequest.findMany({
      where: { questId },
      include: WAITING_USER_INCLUDE,
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    });
    return requests.map((request) => toWaitingUserDto(request));
  }

  // Whatever the Join Policy is by now: accepting is the Leader's own decision, as an invitation is.
  async accept(leaderId: string, questId: string, requestId: string): Promise<void> {
    const request = await this.find(leaderId, questId, requestId);
    const holderIds = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(request.userId, tx);
      if ((await tx.questJoinRequest.findUnique({ where: { id: requestId } })) === null) {
        throw joinRequestNotFound();
      }
      return this.recruiting.enter(questId, request.userId, tx, (quest) => {
        if (quest.leaderId !== leaderId) {
          throw notLeader();
        }
      });
    });
    this.signals.send(holderIds, 'quests-changed');
  }

  async decline(leaderId: string, questId: string, requestId: string): Promise<void> {
    const request = await this.find(leaderId, questId, requestId);
    await this.prisma.$transaction(async (tx) => {
      await this.users.lock(request.userId, tx);
      await this.leader.lockLed(questId, leaderId, tx);
      if ((await tx.questJoinRequest.deleteMany({ where: { id: requestId } })).count === 0) {
        throw joinRequestNotFound();
      }
    });
    // The Leader's count of waiting requests changed too.
    this.signals.send([request.userId, leaderId], 'quests-changed');
  }

  // The request to the Quest the User leads, read without a lock to learn whom to lock.
  private async find(leaderId: string, questId: string, requestId: string): Promise<QuestJoinRequest> {
    await this.leader.ledBy(questId, leaderId);
    const request = await this.prisma.questJoinRequest.findFirst({ where: { id: requestId, questId } });
    if (request === null) {
      throw joinRequestNotFound();
    }
    return request;
  }
}
