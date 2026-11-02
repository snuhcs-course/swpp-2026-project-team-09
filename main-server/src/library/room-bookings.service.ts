/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type Catalogue } from '../assistant/library/catalogue.js';
import { PrismaService } from '../common/prisma.service.js';
import { RoomRequestStatus } from '../generated/prisma/client.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { QuestsService } from '../quests/quests.service.js';
import { registeredNameOf } from '../users/dto/profile.dto.js';
import { UsersService } from '../users/users.service.js';
import { type RoomCompanionDto, type RoomResultDto } from './dto/room-request.dto.js';
import {
  type HeldRequest,
  notInStatus,
  refusedFor,
  type Settling,
  settleOwn,
  spaceOf,
  whenWords,
} from './room-request-parts.js';
import { ROOM_CATALOGUE, RoomRequestSync } from './room-request-sync.service.js';

// The requester's booking: the companions' details for the phone, what the booking came to, and its cancel. The
// phone books with the library; the server is told only whether it did, with no library data.

type Companions = { refused: RoomRequestStatus } | { userIds: string[] };

@Injectable()
export class RoomBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: RoomRequestSync,
    private readonly quests: QuestsService,
    private readonly users: UsersService,
    @Inject(ROOM_CATALOGUE) private readonly catalogue: Catalogue,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // The registered names and 학번 of the companions, for the requester's phone only and only while ready: those who
  // are Holders of the party and consented, checked as the reply is built.
  async companions(userId: string, requestId: string): Promise<RoomCompanionDto[]> {
    await this.sync.expireDue(this.clock.now());
    const found = await settleOwn<Companions>(this.sync, userId, requestId, (settling, held) =>
      this.consentingHolders(settling, held),
    );
    if ('refused' in found) {
      return notInStatus(found.refused);
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: found.userIds } },
      select: { id: true, name: true, registeredName: true, studentNumber: true },
    });
    return found.userIds.flatMap((companion) => {
      const user = users.find(({ id }) => id === companion);
      return user === undefined
        ? []
        : [{ userId: user.id, registeredName: registeredNameOf(user), studentNumber: user.studentNumber }];
    });
  }

  // Booked; a companion the library did not recognise, who is asked to check their 내 정보; or neither, a message
  // about the room or the time, which leaves the request ready. A repeat of booked changes nothing.
  async result(userId: string, requestId: string, { ok, failedUserId }: RoomResultDto): Promise<void> {
    await this.sync.expireDue(this.clock.now());
    await settleOwn(this.sync, userId, requestId, async (settling, held) => {
      if (ok && held.status === RoomRequestStatus.booked) {
        return;
      }
      if (held.status !== RoomRequestStatus.ready) {
        notInStatus(held.status);
      }
      if (ok) {
        await this.booked(settling, held);
      } else if (failedUserId !== undefined) {
        await this.unrecognised(settling, held, failedUserId);
      }
    });
  }

  // The requester cancelled the booked room on the phone. A booking party made for it goes, with its Sub Quest; an
  // existing Quest stays. A repeat changes nothing.
  async cancelled(userId: string, requestId: string): Promise<void> {
    await settleOwn(this.sync, userId, requestId, async (settling, held) => {
      if (held.status === RoomRequestStatus.cancelled) {
        return;
      }
      if (held.status !== RoomRequestStatus.booked) {
        notInStatus(held.status);
      }
      await settling.tx.roomRequest.update({
        where: { id: requestId },
        data: { status: RoomRequestStatus.cancelled },
      });
      const holders = await this.quests.holderIds(held.questId, settling.tx);
      const members = holders.filter((holder) => holder !== userId);
      await this.sync.notify(settling, held, members, await this.doneText(held, '예약을 취소했어요'));
      await this.sync.finish(settling, held);
    });
  }

  private async consentingHolders(settling: Settling, held: HeldRequest): Promise<Companions> {
    await this.sync.reconcile(settling, held);
    const { status } = await settling.tx.roomRequest.findUniqueOrThrow({ where: { id: held.id } });
    if (status !== RoomRequestStatus.ready) {
      return { refused: status };
    }
    const holders = await this.quests.holderIds(held.questId, settling.tx);
    const userIds = held.consents
      .filter(({ userId, consented }) => consented === true && holders.includes(userId))
      .map(({ userId }) => userId);
    return { userIds };
  }

  private async booked(settling: Settling, held: HeldRequest): Promise<void> {
    await settling.tx.roomRequest.update({ where: { id: held.id }, data: { status: RoomRequestStatus.booked } });
    const companions = held.consents.map(({ userId }) => userId);
    await this.sync.notify(settling, held, companions, await this.doneText(held, '예약을 마쳤어요'));
    await this.sync.finish(settling, held, { keepQuest: true });
  }

  private async unrecognised(settling: Settling, held: HeldRequest, failedUserId: string): Promise<void> {
    if (!held.consents.some(({ userId }) => userId === failedUserId)) {
      throw refusedFor('failedUserId', 'This User is not a companion of the request.');
    }
    const { tx } = settling;
    await tx.roomConsent.update({
      where: { requestId_userId: { requestId: held.id, userId: failedUserId } },
      data: { consented: null, answeredAt: null },
    });
    await tx.roomRequest.update({
      where: { id: held.id },
      data: { failedUserId, status: RoomRequestStatus.gathering },
    });
    this.sync.tell(settling, held);
  }

  // "{booker}님이 {space} {date time} 예약을 마쳤어요", by the booker's display name.
  private async doneText(request: HeldRequest, what: string): Promise<string> {
    const booker = await this.users.findById(request.requesterId);
    const { name } = spaceOf(this.catalogue, request.spaceId);
    return `${booker.name}님이 ${name} ${whenWords(request.date, request.start)} ${what}`;
  }
}
