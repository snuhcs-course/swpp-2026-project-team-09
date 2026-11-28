/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { JoinPolicy, type Prisma } from '../generated/prisma/client.js';
import { RoomRequestSync } from '../library/room-request-sync.service.js';
import { type Told } from '../notifications/notification.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UsageService } from '../usage/usage.service.js';
import { UsersService } from '../users/users.service.js';
import { ClassQuestsService } from './class-quests.service.js';
import { CLOCK, type Clock } from './clock.js';
import { subQuestsAheadWhere } from './dto/quest.dto.js';
import {
  JoinRequestUserDto,
  QuestRemovalDto,
  toWaitingDto,
  toWaitingUserDto,
  WAITING_INCLUDE,
  WAITING_USER_INCLUDE,
  WaitingDto,
} from './dto/waiting.dto.js';
import { LeaderService } from './leader.service.js';
import { QuestsService } from './quests.service.js';
import { RecruitingService } from './recruiting.service.js';
import { alreadyHolder, conflict, notFound, notLeader, notRecruiting, sharedQuestHeld } from './refusals.js';
import { wasRemoved } from './removals.js';

// What the one who asked is told of the Leader's answer.
const ANSWERED_INCLUDE = { quest: { select: { title: true, leader: { select: { name: true } } } } } as const;

type Answered = Prisma.QuestJoinRequestGetPayload<{ include: typeof ANSWERED_INCLUDE }>;

const joinRequestNotFound = (): NotFoundException =>
  notFound('QUEST_JOIN_REQUEST_NOT_FOUND', 'No such request to join waits for this answer from this User.');

// Requests to join an Approval Quest, or an Open one the Leader removed the User from (QuestRemoval). A request waits
// until the User withdraws it or the Leader answers it, and ends with the Quest and when the User enters it in any way
// (RecruitingService.enter). Withdrawing and answering lock the User who asked first, so that one request gets one of
// them. One to a Quest with no Sub Quest ahead stays stored but is listed nowhere: accepting it would be refused.
// The Leader keeps one Notification of a Quest's waiting requests, which rings when the first of them is asked and is
// rewritten as they change; the one who asked keeps one of the answer.
@Injectable()
export class JoinRequestsService {
  private readonly logger = new Logger(JoinRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly quests: QuestsService,
    private readonly recruiting: RecruitingService,
    private readonly leader: LeaderService,
    private readonly signals: SignalsService,
    private readonly classQuests: ClassQuestsService,
    private readonly roomRequests: RoomRequestSync,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly usage: UsageService,
    private readonly notifications: NotificationsService,
  ) {}

  // A Closed Quest is answered as unknown, as joining it is. A User who holds the Quest alone for its Global Event may
  // ask, and loses that Quest on being accepted. An Open Quest takes a request only from a User the Leader removed.
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
      if (quest.joinPolicy === JoinPolicy.open && !(await wasRemoved(tx, questId, userId))) {
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
    this.tellLeader(leaderId, questId, 'asked');
    return toWaitingDto(request);
  }

  // The User's own waiting requests, the newest first.
  async listSent(userId: string): Promise<WaitingDto[]> {
    const requests = await this.prisma.questJoinRequest.findMany({
      where: { userId, quest: subQuestsAheadWhere(this.clock.now()) },
      include: WAITING_INCLUDE,
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    });
    return requests.map((request) => toWaitingDto(request));
  }

  async withdraw(userId: string, requestId: string): Promise<void> {
    const { leaderId, questId } = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      const request = await tx.questJoinRequest.findFirst({
        where: { id: requestId, userId },
        include: { quest: true },
      });
      if (request === null || (await tx.questJoinRequest.deleteMany({ where: { id: requestId } })).count === 0) {
        throw joinRequestNotFound();
      }
      return { leaderId: request.quest.leaderId, questId: request.questId };
    });
    this.signals.send([leaderId], 'quests-changed');
    this.tellLeader(leaderId, questId, 'changed');
  }

  // The Quests the Leader removed the User from since the User last entered each, the latest first.
  async listRemovals(userId: string): Promise<QuestRemovalDto[]> {
    const removals = await this.prisma.questRemoval.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { questId: 'desc' }],
    });
    return removals.map(({ questId, createdAt }) => ({ questId, removedAt: createdAt.toISOString() }));
  }

  // The requests to the Quest, whatever its Join Policy, the newest first, each marked when the Leader removed its User
  // before.
  async listReceived(leaderId: string, questId: string): Promise<JoinRequestUserDto[]> {
    await this.leader.ledBy(questId, leaderId);
    const [requests, removals] = await Promise.all([
      this.prisma.questJoinRequest.findMany({
        where: { questId, quest: subQuestsAheadWhere(this.clock.now()) },
        include: WAITING_USER_INCLUDE,
        orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.questRemoval.findMany({ where: { questId }, select: { userId: true } }),
    ]);
    const removedIds = new Set(removals.map(({ userId }) => userId));
    return requests.map((request) =>
      Object.assign(toWaitingUserDto(request), { removedBefore: removedIds.has(request.userId) }),
    );
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
    // For the User who asked, not the Leader who pressed.
    this.usage.sent(request.userId, 'party_join_completed', { how: 'request_accepted' });
    this.tellAnswer(request, 'join-accepted');
    this.tellLeader(leaderId, questId, 'changed');
    await this.roomRequests.questChanged(questId);
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
    this.tellAnswer(request, 'join-declined');
    this.tellLeader(leaderId, questId, 'changed');
  }

  // The request to the Quest the User leads, read without a lock to learn whom to lock.
  private async find(leaderId: string, questId: string, requestId: string): Promise<Answered> {
    await this.leader.ledBy(questId, leaderId);
    const request = await this.prisma.questJoinRequest.findFirst({
      where: { id: requestId, questId },
      include: ANSWERED_INCLUDE,
    });
    if (request === null) {
      throw joinRequestNotFound();
    }
    return request;
  }

  // Not awaited: a Notification never fails the answer.
  private tellAnswer({ userId, questId, quest }: Answered, kind: 'join-accepted' | 'join-declined'): void {
    const told: Told = { kind, questId, questTitle: quest.title, leaderName: quest.leader.name };
    this.notifications.schedule(userId, told, this.clock.now()).catch((error: unknown) => {
      this.logger.warn(`The one who asked was not told of the answer: ${String(error)}`);
    });
  }

  // Not awaited, as `tellAnswer`. A request `asked` while none other waits rings; any other change rewrites it without
  // ringing again, and none left forgets it, so that the next request rings again.
  private tellLeader(leaderId: string, questId: string, change: 'asked' | 'changed'): void {
    this.keepWaitingNotice(leaderId, questId, change).catch((error: unknown) => {
      this.logger.warn(`The Leader was not told of the requests to join: ${String(error)}`);
    });
  }

  private async keepWaitingNotice(leaderId: string, questId: string, change: 'asked' | 'changed'): Promise<void> {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
      select: {
        title: true,
        joinRequests: { orderBy: [{ sentAt: 'desc' }, { id: 'desc' }], select: { user: { select: { name: true } } } },
      },
    });
    const newest = quest?.joinRequests[0];
    if (quest === null || newest === undefined) {
      await this.notifications.cancel(leaderId, 'join-asked', { kind: 'party', id: questId });
      return;
    }
    const waiting = quest.joinRequests.length;
    const told: Told = { kind: 'join-asked', questId, questTitle: quest.title, name: newest.user.name, waiting };
    await (change === 'asked' && waiting === 1
      ? this.notifications.schedule(leaderId, told, this.clock.now())
      : this.notifications.renew(leaderId, told, this.clock.now()));
  }
}
