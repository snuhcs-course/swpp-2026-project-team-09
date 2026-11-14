/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { lastBookableDate } from '../assistant/library/booking-rules.js';
import { type Catalogue } from '../assistant/library/catalogue.js';
import { windowOpening } from '../assistant/library/window-opening.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { Prisma, RoomRequestStatus } from '../generated/prisma/client.js';
import { type Card } from '../notifications/card-address.js';
import { type NotificationKind, type Told } from '../notifications/notification.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { answerDeadline, DEADLINE_AHEAD_MS } from './room-answer-deadline.js';
import { agreedTold, declinedTolds, goingOut, type Leaving, questNow, takeOut } from './room-companions-out.js';
import {
  ACTIVE,
  DECLINED,
  type HeldRequest,
  isIn,
  moreNeededOf,
  overRefusal,
  roomLabelOf,
  RoomRequestGone,
  type Settling,
} from './room-request-parts.js';

// Keeps the room requests true to their Quests (README.md: Group study room requests). Whatever changes a Quest's
// Holders or invitations, deletes it or ends a friendship calls it once the change is stored, and it settles each
// request still gathering against the Quest as it is then: a companion leaving, being removed or unfriending goes out of
// the request, and a Holder who joined later is asked too. It depends on nothing of the Quests' module, which calls it.

// Read by its own factory, since the Assistant's module, which reads the same file, depends on the Quests' module.
export const ROOM_CATALOGUE = 'ROOM_CATALOGUE';

const NEW_CONSENT = { answeredAt: null, consented: null };

function between(requesterId: string, companionId: string): Prisma.RoomRequestWhereInput {
  return { requesterId, consents: { some: { userId: companionId } } };
}

@Injectable()
export class RoomRequestSync {
  private readonly logger = new Logger(RoomRequestSync.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signals: SignalsService,
    private readonly notifications: NotificationsService,
    @Inject(ROOM_CATALOGUE) private readonly catalogue: Catalogue,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // After a Quest's Holders or invitations changed, or it was deleted.
  async questChanged(questId: string): Promise<void> {
    const requests = await this.prisma.roomRequest.findMany({
      where: { questId, status: { in: ACTIVE } },
      select: { id: true },
    });
    for (const { id } of requests) {
      // oxlint-disable-next-line no-await-in-loop -- each request in its own transaction, one after another
      await this.quietly(id, (settling, request) => this.reconcile(settling, request));
    }
  }

  // After a friendship between the two ended: the one asked by the other's request goes out of it.
  async friendshipEnded(userId: string, otherUserId: string): Promise<void> {
    const requests = await this.prisma.roomRequest.findMany({
      where: { status: { in: ACTIVE }, OR: [between(userId, otherUserId), between(otherUserId, userId)] },
      select: { id: true, requesterId: true },
    });
    for (const { id, requesterId } of requests) {
      const companionId = requesterId === userId ? otherUserId : userId;
      // oxlint-disable-next-line no-await-in-loop -- as above
      await this.quietly(id, (settling, request) =>
        this.reconcile(settling, request, [{ userId: companionId, answered: true }]),
      );
    }
  }

  // A request still not booked at its start expires, and a booking party made for it goes; a companion still asked at
  // the request's deadline goes out of it. Run before each room request is read, as nothing else runs on a schedule.
  async expireDue(now: Date): Promise<void> {
    const due = await this.prisma.roomRequest.findMany({
      where: { status: { in: ACTIVE }, startsAt: { lte: now } },
      select: { id: true },
    });
    for (const { id } of due) {
      // oxlint-disable-next-line no-await-in-loop -- as above
      await this.quietly(id, async (settling, request) => {
        if (!ACTIVE.includes(request.status)) {
          return;
        }
        await settling.tx.roomRequest.update({ where: { id }, data: { status: RoomRequestStatus.expired } });
        await this.finish(settling, request);
      });
    }
    await this.passDeadlines(now);
  }

  // Locks the request's Quest, then the request, and makes the change to the request as it is then. Tells the Users it
  // concerns once it is stored, and keeps its Notifications without waiting for them.
  async settle<T>(requestId: string, change: (settling: Settling, request: HeldRequest) => Promise<T>): Promise<T> {
    const told = new Set<string>();
    const questsChanged = new Set<string>();
    const afterwards: (() => Promise<void>)[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      const found = await tx.roomRequest.findUnique({ where: { id: requestId }, select: { questId: true } });
      if (found !== null) {
        await tx.$queryRaw`SELECT 1 FROM quests WHERE id = ${found.questId}::uuid FOR NO KEY UPDATE`;
        await tx.$queryRaw`SELECT 1 FROM room_requests WHERE id = ${requestId}::uuid FOR UPDATE`;
      }
      const request = await tx.roomRequest.findUnique({ where: { id: requestId }, include: { consents: true } });
      if (request === null) {
        throw new RoomRequestGone();
      }
      return change({ tx, told, questsChanged, afterwards }, request);
    });
    this.signals.send([...told], 'room-requests-changed');
    this.signals.send([...questsChanged], 'quests-changed');
    for (const job of afterwards) {
      job().catch((error: unknown) => {
        this.logger.warn(`A room request's Notification was not kept: ${String(error)}`);
      });
    }
    return result;
  }

  // Keeps the Notification once the change is stored, for the time given or now.
  tellLater(settling: Settling, userId: string, told: Told, at = this.clock.now()): void {
    settling.afterwards.push(() => this.notifications.schedule(userId, told, at));
  }

  forgetLater(settling: Settling, userId: string, kind: NotificationKind, card: Card): void {
    settling.afterwards.push(() => this.notifications.cancel(userId, kind, card));
  }

  // Keeps the Notification without a settling, such as when a request is made, without the caller waiting for it.
  tellNow(userId: string, told: Told, at: Date): void {
    this.notifications.schedule(userId, told, at).catch((error: unknown) => {
      this.logger.warn(`A room request's Notification was not kept: ${String(error)}`);
    });
  }

  // Brings a gathering or ready request in line with its Quest, with these companions going out of it as well.
  async reconcile(settling: Settling, request: HeldRequest, leaving: readonly Leaving[] = []): Promise<void> {
    if (!ACTIVE.includes(request.status)) {
      return;
    }
    const quest = await questNow(settling.tx, request.questId);
    if (quest === null || !quest.holders.has(request.requesterId)) {
      await this.dissolve(settling, request, DECLINED);
      return;
    }
    const now = this.clock.now();
    const gone = goingOut(request, quest, leaving);
    const kept = await takeOut(settling, request, gone, now);
    const newcomers = [...quest.holders].filter(
      (userId) => userId !== request.requesterId && !kept.some((consent) => consent.userId === userId),
    );
    const asked = newcomers.map((userId) => ({ ...NEW_CONSENT, requestId: request.id, userId, askedAt: now }));
    const held = { ...request, consents: [...kept, ...asked] };
    if (newcomers.length > 0) {
      await settling.tx.roomConsent.createMany({
        data: newcomers.map((userId) => ({ requestId: request.id, userId, askedAt: now })),
      });
    }
    const companionsIn = held.consents.filter(isIn);
    const space = this.catalogue.byId.get(request.spaceId);
    const refusal = newcomers.length > 0 ? overRefusal(this.catalogue, space, 1 + companionsIn.length) : null;
    if (companionsIn.length === 0 || refusal !== null) {
      await this.dissolve(settling, held, refusal?.reason ?? DECLINED);
      return;
    }
    await this.tellOut(settling, held, gone, moreNeededOf(space, companionsIn.length));
    const ready =
      newcomers.length === 0 &&
      moreNeededOf(space, companionsIn.length) === 0 &&
      companionsIn.every(({ userId, consented }) => consented === true && quest.holders.has(userId));
    await this.setReady(settling, held, ready);
  }

  // Ends the request when the booker is no longer in it, nobody is left with them, or more people than the room holds
  // are: its consents go, a booking party made for it is deleted, and everyone it asked gets the notice. An existing
  // Quest stays as it is.
  async dissolve(settling: Settling, request: HeldRequest, reason: string): Promise<void> {
    await settling.tx.roomRequest.update({
      where: { id: request.id },
      data: { status: RoomRequestStatus.dissolved, reason },
    });
    await this.notify(settling, request, this.membersOf(request), reason);
    await this.finish(settling, request);
  }

  // Deletes the consents and, for a booking party unless it is kept, the Quest with its Sub Quest and invitations. For
  // every final status, and for booked, which keeps the booking party.
  async finish(settling: Settling, request: HeldRequest, { keepQuest = false } = {}): Promise<void> {
    const { tx } = settling;
    await tx.roomConsent.deleteMany({ where: { requestId: request.id } });
    this.tell(settling, request);
    this.forgetWindow(settling, request);
    if (keepQuest || !request.madeForBooking) {
      return;
    }
    const quest = await tx.quest.findUnique({
      where: { id: request.questId },
      select: { holders: { select: { userId: true } }, invitations: { select: { userId: true } } },
    });
    if (quest === null) {
      return;
    }
    await tx.quest.delete({ where: { id: request.questId } });
    for (const { userId } of [...quest.holders, ...quest.invitations]) {
      settling.questsChanged.add(userId);
    }
  }

  // A request made before the booking window held its date, ending before the window opens, tells nothing then.
  private forgetWindow(settling: Settling, request: HeldRequest): void {
    const space = this.catalogue.byId.get(request.spaceId);
    const waited = space !== undefined && request.date > lastBookableDate(space, request.createdAt);
    if (waited && windowOpening(space, request.date) > this.clock.now()) {
      this.forgetLater(settling, request.requesterId, 'room-window', { kind: 'party', id: request.questId });
    }
  }

  // The one-time notice on the main screen of each of these Users.
  async notify(settling: Settling, request: HeldRequest, userIds: readonly string[], text: string): Promise<void> {
    const once = [...new Set(userIds)];
    await settling.tx.roomNotice.createMany({ data: once.map((userId) => ({ userId, requestId: request.id, text })) });
    for (const userId of once) {
      settling.told.add(userId);
    }
  }

  membersOf(request: HeldRequest): string[] {
    return [request.requesterId, ...request.consents.map(({ userId }) => userId)];
  }

  tell(settling: Settling, request: HeldRequest): void {
    for (const userId of this.membersOf(request)) {
      settling.told.add(userId);
    }
  }

  // The booker hears of each companion who went out, and how many more the room needs now.
  private async tellOut(
    settling: Settling,
    request: HeldRequest,
    gone: readonly Leaving[],
    more: number,
  ): Promise<void> {
    const label = roomLabelOf(this.catalogue.byId.get(request.spaceId), request.spaceId);
    for (const told of await declinedTolds(settling.tx, request, gone, label, more)) {
      this.tellLater(settling, request.requesterId, told);
    }
  }

  // Gathering or ready; the booker hears when it becomes ready.
  private async setReady(settling: Settling, request: HeldRequest, ready: boolean): Promise<void> {
    const status = ready ? RoomRequestStatus.ready : RoomRequestStatus.gathering;
    if (status !== request.status) {
      await settling.tx.roomRequest.update({ where: { id: request.id }, data: { status } });
    }
    if (ready && request.status !== RoomRequestStatus.ready) {
      const label = roomLabelOf(this.catalogue.byId.get(request.spaceId), request.spaceId);
      this.tellLater(settling, request.requesterId, await agreedTold(settling.tx, request, label));
    }
    this.tell(settling, request);
  }

  // Each companion still asked at their own deadline, counted from when they were asked, goes out of a gathering
  // request, as unanswered.
  private async passDeadlines(now: Date): Promise<void> {
    const asking = await this.prisma.roomRequest.findMany({
      where: {
        status: RoomRequestStatus.gathering,
        startsAt: { gt: now, lte: new Date(now.getTime() + DEADLINE_AHEAD_MS) },
        consents: { some: { consented: null } },
      },
      select: { id: true, startsAt: true, consents: { where: { consented: null }, select: { askedAt: true } } },
    });
    const late = (askedAt: Date, startsAt: Date): boolean => (answerDeadline(askedAt, startsAt) ?? Infinity) <= now;
    const due = asking.filter(({ startsAt, consents }) => consents.some(({ askedAt }) => late(askedAt, startsAt)));
    for (const { id } of due) {
      // oxlint-disable-next-line no-await-in-loop -- as above
      await this.quietly(id, async (settling, request) => {
        const unanswered = request.consents
          .filter(({ consented, askedAt }) => consented === null && late(askedAt, request.startsAt))
          .map(({ userId }) => ({ userId, answered: false }));
        if (request.status === RoomRequestStatus.gathering && unanswered.length > 0) {
          await this.reconcile(settling, request, unanswered);
        }
      });
    }
  }

  // For the calls after another feature's change, which is stored already: a request that cannot be settled stays as
  // it is until it is read again, and the change is not refused for it.
  private async quietly(
    requestId: string,
    change: (settling: Settling, request: HeldRequest) => Promise<void>,
  ): Promise<void> {
    try {
      await this.settle(requestId, change);
    } catch (error) {
      if (!(error instanceof RoomRequestGone)) {
        const kind = error instanceof Error ? error.name : 'error';
        this.logger.warn(`The room request ${requestId} was not settled: ${kind}`);
      }
    }
  }
}
