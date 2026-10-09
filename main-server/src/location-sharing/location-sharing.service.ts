/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { CampusBoundary } from '../common/campus-boundary.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { PositionDto, UploadedPositionDto, UploadPositionDto } from './dto/position.dto.js';
import { PositionStore } from './position-store.js';
import { VisibilityService } from './visibility.service.js';

// Provisional until P17 has checked them on a phone.
const MAX_POSITION_AGE_MS = 60_000;
const MAX_POSITION_LEAD_MS = 10_000;
const MAX_ACCURACY_METRES = 100;

const positionRefused = (code: string, message: string): BadRequestException =>
  new BadRequestException({ statusCode: HttpStatus.BAD_REQUEST, error: 'Bad Request', code, message });

@Injectable()
export class LocationSharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campusBoundary: CampusBoundary,
    private readonly positions: PositionStore,
    private readonly visibility: VisibilityService,
    private readonly signals: SignalsService,
  ) {}

  // Turning it off clears the User's position.
  async setMasterSwitch(userId: string, on: boolean): Promise<void> {
    await this.visibility.announceRemovals(userId, async () => {
      await this.prisma.user.update({ where: { id: userId }, data: { masterSwitchOn: on } });
      if (!on) {
        await this.positions.clear(userId);
      }
    });
  }

  // Keeps a position inside the Campus Boundary and pushes it to whoever may see the User now. One outside is not kept,
  // and clears the one stored.
  async upload(
    userId: string,
    { latitude, longitude, accuracy, measuredAt }: UploadPositionDto,
  ): Promise<UploadedPositionDto> {
    const { masterSwitchOn } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { masterSwitchOn: true },
    });
    if (!masterSwitchOn) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        code: 'MASTER_SWITCH_OFF',
        message: 'Turn the Master Switch on to share your position.',
      });
    }
    const measured = new Date(measuredAt);
    const lead = measured.getTime() - Date.now();
    if (-lead > MAX_POSITION_AGE_MS) {
      throw positionRefused(
        'POSITION_TOO_OLD',
        `The position was measured more than ${MAX_POSITION_AGE_MS / 1000} s ago.`,
      );
    }
    if (lead > MAX_POSITION_LEAD_MS) {
      throw positionRefused(
        'POSITION_IN_THE_FUTURE',
        `The position was measured more than ${MAX_POSITION_LEAD_MS / 1000} s ahead of the server's clock.`,
      );
    }
    if (accuracy > MAX_ACCURACY_METRES) {
      throw positionRefused('POSITION_TOO_INACCURATE', `The accuracy radius is over ${MAX_ACCURACY_METRES} m.`);
    }
    if (!this.campusBoundary.contains({ latitude, longitude })) {
      await this.clearPosition(userId);
      return { offCampus: true };
    }
    const position: PositionDto = { userId, latitude, longitude, measuredAt: measured.toISOString() };
    await this.positions.store(userId, { latitude, longitude, measuredAt: position.measuredAt });
    this.signals.send(await this.visibility.viewersOf(userId), 'position', position);
    return { offCampus: false };
  }

  async visiblePositions(viewerId: string): Promise<PositionDto[]> {
    const positions = await this.positions.read(await this.visibility.visibleTo(viewerId));
    return [...positions].map(([userId, { latitude, longitude, measuredAt }]) => ({
      userId,
      latitude,
      longitude,
      measuredAt,
    }));
  }

  // Also when the User's session ends, so that the phone's last position does not linger.
  clearPosition(userId: string): Promise<void> {
    return this.visibility.announceRemovals(userId, () => this.positions.clear(userId));
  }
}
