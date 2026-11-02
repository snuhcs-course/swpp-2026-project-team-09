/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { InvitationsService } from '../quests/invitations.service.js';
import { conflict } from '../quests/refusals.js';
import { UsersService } from '../users/users.service.js';
import { type RoomRequestDto } from './dto/room-request.dto.js';
import { ACTIVE, DECLINED, notInStatus, requestNotFound, settleAsked } from './room-request-parts.js';
import { RoomRequestSync } from './room-request-sync.service.js';
import { RoomRequestsService } from './room-requests.service.js';

// A companion's answers to a room request: 제공하고 참여, 확인했어요 after the library did not recognise them, and 거절
// or 철회. Each is for this request only.
@Injectable()
export class RoomConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: RoomRequestSync,
    private readonly requests: RoomRequestsService,
    private readonly invitations: InvitationsService,
    private readonly users: UsersService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // Accepts a booking party's invitation as any invitation is accepted, then sets the consent. The 학번 must be in
  // 내 정보 first, which the dialog asks for.
  async consent(userId: string, requestId: string): Promise<RoomRequestDto> {
    await this.sync.expireDue(this.clock.now());
    const { studentNumber } = await this.users.findById(userId);
    if (studentNumber === null) {
      throw conflict('STUDENT_NUMBER_MISSING', 'Save the 학번 in 내 정보 first.');
    }
    const request = await this.prisma.roomRequest.findUnique({ where: { id: requestId }, include: { consents: true } });
    if (request === null || !request.consents.some((consent) => consent.userId === userId)) {
      return requestNotFound();
    }
    if (!ACTIVE.includes(request.status)) {
      return notInStatus(request.status);
    }
    const invitation = request.madeForBooking
      ? await this.prisma.questInvitation.findUnique({
          where: { questId_userId: { questId: request.questId, userId } },
        })
      : null;
    if (invitation !== null) {
      await this.invitations.accept(userId, invitation.id);
    }
    await settleAsked(this.sync, userId, requestId, async (settling, held) => {
      await settling.tx.roomConsent.update({
        where: { requestId_userId: { requestId, userId } },
        data: { consented: true, answeredAt: this.clock.now() },
      });
      if (held.failedUserId === userId) {
        await settling.tx.roomRequest.update({ where: { id: requestId }, data: { failedUserId: null } });
      }
      const consents = held.consents.map((consent) =>
        consent.userId === userId ? { ...consent, consented: true } : consent,
      );
      await this.sync.reconcile(settling, { ...held, consents });
    });
    return this.requests.read(userId, requestId);
  }

  // 거절, or 철회 after consenting: the request is dissolved.
  async decline(userId: string, requestId: string): Promise<void> {
    await this.sync.expireDue(this.clock.now());
    await settleAsked(this.sync, userId, requestId, (settling, held) => this.sync.dissolve(settling, held, DECLINED));
  }
}
