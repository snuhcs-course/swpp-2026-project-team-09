/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { checkBooking, clockOfMinutes, minutesOfClock } from '../assistant/library/booking-rules.js';
import { type Catalogue, KWANJEONG_PLACE_NUMBER, type LibrarySpace, statusOf } from '../assistant/library/catalogue.js';
import { bookKeyOf } from '../assistant/library/library-card.js';
import { PrismaService } from '../common/prisma.service.js';
import { type Settings } from '../common/settings.js';
import { SignalsService } from '../common/signals.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { JoinPolicy, Prisma } from '../generated/prisma/client.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { QuestsService } from '../quests/quests.service.js';
import { UsersService } from '../users/users.service.js';
import { type CreateRoomRequestDto, type RoomInboxDto, type RoomRequestDto } from './dto/room-request.dto.js';
import {
  ACTIVE,
  refusedFor,
  refusedWith,
  requestNotFound,
  spaceOf,
  startsAtOf,
  toRoomRequestDto,
} from './room-request-parts.js';
import { ROOM_CATALOGUE, RoomRequestSync } from './room-request-sync.service.js';

// The room requests of the app (README.md: Group study room requests), never the Assistant's tools. A request is made
// from a book card's key, checked again as the Assistant's tool checks it, and asks the requester's Friends through a
// booking party made for it, or the other Holders of a Quest the requester holds.

const BOOKING_OFF = '관정도서관 예약은 공식 사이트나 앱에서 해 주세요.';

interface Slot {
  date: string;
  start: string;
  minutes: number;
}

@Injectable()
export class RoomRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: RoomRequestSync,
    private readonly quests: QuestsService,
    private readonly friends: FriendsService,
    private readonly users: UsersService,
    private readonly signals: SignalsService,
    private readonly settings: ConfigService<Settings, true>,
    @Inject(ROOM_CATALOGUE) private readonly catalogue: Catalogue,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(userId: string, body: CreateRoomRequestDto): Promise<RoomRequestDto> {
    if (!this.settings.get('LIBRARY_BOOKING_ENABLED', { infer: true })) {
      throw refusedFor('key', BOOKING_OFF);
    }
    const asked = bookKeyOf(body.key);
    if (asked === null) {
      throw refusedFor('key', '방 예약 카드가 아니에요');
    }
    const space = await this.roomSpace(userId, asked.spaceId);
    const companionIds = [
      ...new Set('questId' in body ? await this.holdersBesides(userId, body.questId) : body.friendIds),
    ];
    if ('friendIds' in body) {
      await this.refuseStrangers(userId, companionIds);
    }
    const people = 1 + companionIds.length;
    const now = this.clock.now();
    const checked = checkBooking(this.catalogue, space, { ...asked, useDesc: body.useDesc, people }, now);
    if ('refusals' in checked) {
      throw refusedWith(checked.refusals);
    }
    const { date, start, minutes, useDesc } = checked.booking;
    const slot = { date, start, minutes };
    const id = await this.prisma.$transaction(async (tx) => {
      const questId =
        'questId' in body
          ? await this.sameHolders(userId, body.questId, companionIds, tx)
          : await this.makeBookingParty(userId, space, slot, companionIds, tx);
      const request = await tx.roomRequest.create({
        data: {
          ...slot,
          questId,
          madeForBooking: 'friendIds' in body,
          requesterId: userId,
          spaceId: space.id,
          startsAt: startsAtOf(date, start),
          useDesc,
          consents: { create: companionIds.map((companion) => ({ userId: companion })) },
        },
      });
      return request.id;
    });
    this.signals.send(companionIds, 'quests-changed');
    this.signals.send([userId, ...companionIds], 'room-requests-changed');
    return this.read(userId, id);
  }

  async read(userId: string, requestId: string): Promise<RoomRequestDto> {
    await this.sync.expireDue(this.clock.now());
    const request = await this.prisma.roomRequest.findUnique({
      where: { id: requestId },
      include: { consents: true, notices: { where: { userId }, select: { id: true } } },
    });
    const concerned =
      request !== null &&
      (request.requesterId === userId ||
        request.consents.some((consent) => consent.userId === userId) ||
        request.notices.length > 0);
    if (request === null || !concerned) {
      return requestNotFound();
    }
    return toRoomRequestDto(this.prisma, this.catalogue, request);
  }

  // The requests that ask the User, and the User's notices, for the main screen.
  async inbox(userId: string): Promise<RoomInboxDto> {
    await this.sync.expireDue(this.clock.now());
    const consents = await this.prisma.roomConsent.findMany({
      where: { userId, request: { status: { in: ACTIVE } } },
      include: { request: { include: { requester: { select: { id: true, name: true } } } } },
      orderBy: { request: { createdAt: 'asc' } },
    });
    const notices = await this.prisma.roomNotice.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return {
      asks: consents.map(({ request, consented }) => ({
        requestId: request.id,
        requester: { userId: request.requester.id, name: request.requester.name },
        space: spaceOf(this.catalogue, request.spaceId),
        date: request.date,
        start: request.start,
        minutes: request.minutes,
        consented,
        recheck: request.failedUserId === userId,
      })),
      notices: notices.map(({ id, requestId, text }) => ({ id, requestId, text })),
    };
  }

  // The notice is shown once.
  async seen(userId: string, noticeId: string): Promise<void> {
    await this.prisma.roomNotice.deleteMany({ where: { id: noticeId, userId } });
  }

  // A room sector this User may book.
  private async roomSpace(userId: string, spaceId: string): Promise<LibrarySpace> {
    const space = this.catalogue.byId.get(spaceId);
    const { affiliation } = await this.users.findById(userId);
    if (space === undefined || statusOf(space, affiliation) !== 'implemented' || space.unit !== 'room') {
      throw refusedFor('key', '함께 예약할 수 있는 방이 아니에요');
    }
    return space;
  }

  private async holdersBesides(userId: string, questId: string): Promise<string[]> {
    const quest = await this.quests.read(userId, questId);
    const others = quest.holders.map(({ id }) => id).filter((id) => id !== userId);
    if (others.length === 0) {
      throw refusedFor('questId', '파티에 다른 구성원이 없어요');
    }
    return others;
  }

  private async refuseStrangers(userId: string, friendIds: readonly string[]): Promise<void> {
    const friends = new Set((await this.friends.listFriends(userId)).map(({ id }) => id));
    if (friendIds.some((friendId) => !friends.has(friendId))) {
      throw refusedFor('friendIds', '친구가 아닌 사람이 있어요');
    }
  }

  // The existing Quest, once locked, still held by the requester and the companions counted.
  private async sameHolders(
    userId: string,
    questId: string,
    companionIds: readonly string[],
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    await this.quests.lock(questId, tx);
    const holders = await this.quests.holderIds(questId, tx);
    const others = holders.filter((holder) => holder !== userId);
    if (!holders.includes(userId) || others.length !== companionIds.length) {
      throw refusedFor('questId', '파티 구성원이 바뀌었어요. 다시 해 주세요');
    }
    return questId;
  }

  // The Closed Quest "관정 {space} 예약" the requester leads, with one Sub Quest at 관정관 for the booking's time, and
  // an invitation for each Friend.
  private async makeBookingParty(
    userId: string,
    space: LibrarySpace,
    { date, start, minutes }: Slot,
    friendIds: readonly string[],
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const title = `관정 ${space.name} 예약`;
    const place = await tx.place.findFirst({ where: { number: KWANJEONG_PLACE_NUMBER }, select: { id: true } });
    const questId = await this.quests.createWithSubQuest(
      {
        title,
        startsAt: startsAtOf(date, start),
        endsAt: startsAtOf(date, clockOfMinutes(minutesOfClock(start) + minutes)),
        placeId: place?.id ?? null,
        latitude: null,
        longitude: null,
        placeLabel: place === null ? `관정관 (${KWANJEONG_PLACE_NUMBER}동)` : null,
      },
      [userId],
      tx,
      { title, capacity: 1 + friendIds.length, joinPolicy: JoinPolicy.closed },
    );
    await tx.questInvitation.createMany({ data: friendIds.map((friendId) => ({ questId, userId: friendId })) });
    return questId;
  }
}
