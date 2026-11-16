/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { UserDayService } from '../assistant/free-time/user-day.service.js';
import { type Catalogue, KWANJEONG_PLACE_NUMBER, roomLabelOf } from '../assistant/library/catalogue.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { placeLabel } from '../plans/own-way.js';
import { clockOf } from '../assistant/free-time/free-time.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { ALONE_CAPACITY, QuestsService } from '../quests/quests.service.js';
import { shownMinutes, TRAVEL_PROVIDER, type TravelProvider } from '../travel/travel.js';
import { type SeatStayBody, type SeatStayDto } from './dto/seat-stay.dto.js';
import { startsAtOf } from './room-request-parts.js';
import { ROOM_CATALOGUE } from './room-request-sync.service.js';
import { type SeatLeaveBy, seatLeaveBy } from './seat-leave-by.js';

const MINUTE_MS = 60_000;

const notASeat = (): BadRequestException =>
  new BadRequestException({
    statusCode: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    code: 'NOT_A_SEAT',
    message: 'Only a seat of a 관정 reading room or zone is a stay.',
  });

// A seat the app booked becomes a Quest taken alone (`takenAlone`) for the stay at 관정관, which is no 파티, with the
// time to leave for the next item kept as the Quest's leave-by.
@Injectable()
export class SeatStaysService {
  private readonly logger = new Logger(SeatStaysService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quests: QuestsService,
    private readonly days: UserDayService,
    private readonly places: PlaceLookup,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
    private readonly notifications: NotificationsService,
    private readonly signals: SignalsService,
    @Inject(ROOM_CATALOGUE) private readonly catalogue: Catalogue,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async make(userId: string, { spaceId, date, start, minutes }: SeatStayBody): Promise<SeatStayDto> {
    const space = this.catalogue.byId.get(spaceId);
    if (space?.unit !== 'seat') {
      throw notASeat();
    }
    const kwanjeong = this.places.numbered(KWANJEONG_PLACE_NUMBER);
    const startsAt = startsAtOf(date, start);
    const endsAt = new Date(startsAt.getTime() + minutes * MINUTE_MS);
    // Read before the stay is held, so that the stay is not its own next item.
    const items = await this.days.itemsOn(userId, date);
    const leave =
      kwanjeong === null
        ? null
        : seatLeaveBy(items, { startsAt, endsAt, placeId: kwanjeong.id }, this.walkingMinutes, this.clock.now());
    const title = roomLabelOf(space, spaceId);
    const questId = await this.prisma.$transaction((tx) =>
      this.quests.createWithSubQuest(
        {
          title,
          startsAt,
          endsAt,
          placeId: kwanjeong?.id ?? null,
          latitude: null,
          longitude: null,
          placeLabel: kwanjeong === null ? `관정관 (${KWANJEONG_PLACE_NUMBER}동)` : null,
        },
        [userId],
        tx,
        { capacity: ALONE_CAPACITY, takenAlone: true },
      ),
    );
    this.signals.send([userId], 'quests-changed');
    const kept = leave === null ? false : await this.keepLeaveBy(userId, questId, leave);
    return {
      quest: await this.quests.read(userId, questId),
      leaveAt: kept && leave !== null ? leave.at.toISOString() : null,
    };
  }

  private readonly walkingMinutes = (from: string, to: string): number =>
    shownMinutes(this.travel.walkingSeconds(from, to));

  // A leave-by that is not kept never fails the stay, which the library already booked.
  private async keepLeaveBy(
    userId: string,
    questId: string,
    { at, placeId, walkMinutes, start, isClass }: SeatLeaveBy,
  ): Promise<boolean> {
    const place = this.places.byId(placeId);
    if (place === null) {
      return false;
    }
    const toward = { start: clockOf(start), word: isClass ? '수업' : '일정' } as const;
    try {
      await this.notifications.schedule(
        userId,
        { kind: 'leave-by', questId, placeLabel: placeLabel(place), walkMinutes, toward },
        at,
      );
      return true;
    } catch (error: unknown) {
      this.logger.warn(`The seat's time to leave was not kept: ${String(error)}`);
      return false;
    }
  }
}
