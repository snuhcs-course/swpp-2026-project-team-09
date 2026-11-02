/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { peopleRefusal } from '../assistant/library/booking-rules.js';
import { type Catalogue } from '../assistant/library/catalogue.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { Prisma, RoomConsent, RoomRequestStatus } from '../generated/prisma/client.js';
import { ACTIVE, DECLINED, type HeldRequest, RoomRequestGone, type Settling } from './room-request-parts.js';

// Keeps the room requests true to their Quests (README.md: Group study room requests). Whatever changes a Quest's
// Holders or invitations, deletes it or ends a friendship calls it once the change is stored, and it settles each
// request still gathering against the Quest as it is then: anyone leaving, being removed or unfriending counts as a
// decline, and a Holder who joined later is asked too. It depends on nothing of the Quests' module, which calls it.

// Read by its own factory, since the Assistant's module, which reads the same file, depends on the Quests' module.
export const ROOM_CATALOGUE = 'ROOM_CATALOGUE';

const NEW_CONSENT = { requestId: '', answeredAt: null, consented: null };

function between(requesterId: string, companionId: string): Prisma.RoomRequestWhereInput {
  return { requesterId, consents: { some: { userId: companionId } } };
}

@Injectable()
export class RoomRequestSync {
  private readonly logger = new Logger(RoomRequestSync.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signals: SignalsService,
    @Inject(ROOM_CATALOGUE) private readonly catalogue: Catalogue,
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

  // After a friendship between the two ended: a request of one of them that asks the other is declined.
  async friendshipEnded(userId: string, otherUserId: string): Promise<void> {
    const requests = await this.prisma.roomRequest.findMany({
      where: { status: { in: ACTIVE }, OR: [between(userId, otherUserId), between(otherUserId, userId)] },
      select: { id: true },
    });
    for (const { id } of requests) {
      // oxlint-disable-next-line no-await-in-loop -- as above
      await this.quietly(id, (settling, request) => this.dissolve(settling, request, DECLINED));
    }
  }

  // A request still not booked at its start expires, and a booking party made for it goes. Run before each room
  // request is read, as nothing else runs on a schedule.
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
  }

  // Locks the request's Quest, then the request, and makes the change to the request as it is then. Tells the Users it
  // concerns once it is stored.
  async settle<T>(requestId: string, change: (settling: Settling, request: HeldRequest) => Promise<T>): Promise<T> {
    const told = new Set<string>();
    const questsChanged = new Set<string>();
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
      return change({ tx, told, questsChanged }, request);
    });
    this.signals.send([...told], 'room-requests-changed');
    this.signals.send([...questsChanged], 'quests-changed');
    return result;
  }

  // Brings a gathering or ready request in line with its Quest.
  async reconcile(settling: Settling, request: HeldRequest): Promise<void> {
    if (!ACTIVE.includes(request.status)) {
      return;
    }
    const { tx } = settling;
    const quest = await tx.quest.findUnique({
      where: { id: request.questId },
      select: { holders: { select: { userId: true } }, invitations: { select: { userId: true } } },
    });
    const holders = new Set(quest?.holders.map(({ userId }) => userId));
    const invited = new Set(quest?.invitations.map(({ userId }) => userId));
    // A companion of a booking party who has not answered yet waits on their invitation.
    const stays = ({ userId, consented }: RoomConsent): boolean =>
      holders.has(userId) || (request.madeForBooking && invited.has(userId) && consented !== true);
    if (quest === null || !holders.has(request.requesterId) || !request.consents.every(stays)) {
      await this.dissolve(settling, request, DECLINED);
      return;
    }
    const asked = new Set([request.requesterId, ...request.consents.map(({ userId }) => userId)]);
    const newcomers = [...holders].filter((userId) => !asked.has(userId));
    if (newcomers.length > 0) {
      await tx.roomConsent.createMany({ data: newcomers.map((userId) => ({ requestId: request.id, userId })) });
      const consents = [...request.consents, ...newcomers.map((userId) => ({ ...NEW_CONSENT, userId }))];
      const space = this.catalogue.byId.get(request.spaceId);
      const refusal = space === undefined ? null : peopleRefusal(this.catalogue, space, asked.size + newcomers.length);
      if (refusal !== null) {
        await this.dissolve(settling, { ...request, consents }, refusal.reason);
        return;
      }
      this.tell(settling, { ...request, consents });
    }
    const ready =
      newcomers.length === 0 &&
      request.consents.every(({ userId, consented }) => consented === true && holders.has(userId));
    const status = ready ? RoomRequestStatus.ready : RoomRequestStatus.gathering;
    if (status !== request.status) {
      await tx.roomRequest.update({ where: { id: request.id }, data: { status } });
    }
    this.tell(settling, request);
  }

  // Ends the request as declined, or for the reason given: its consents go, a booking party made for it is deleted, and
  // everyone it asked gets the notice. An existing Quest stays as it is.
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
