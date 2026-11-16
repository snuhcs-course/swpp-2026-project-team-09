/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { CampusBoundary } from '../common/campus-boundary.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { PositionDto, UploadedPositionDto, UploadPositionDto } from './dto/position.dto.js';
import { PositionStore, type StoredPosition } from './position-store.js';
import { PrivateZonesService } from './private-zones.service.js';
import { type SeenLevel, VisibilityService } from './visibility.service.js';

// Provisional until P17 has checked them on a phone.
const MAX_POSITION_AGE_MS = 60_000;
const MAX_POSITION_LEAD_MS = 10_000;
const MAX_ACCURACY_METRES = 100;

// Under the app's two minutes before an Avatar dims.
const PLACE_RENEWAL_MS = 50_000;

const ageMs = (since: string, at: string): number => new Date(at).getTime() - new Date(since).getTime();

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
    private readonly places: PlaceLookup,
    private readonly privateZones: PrivateZonesService,
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

  // Keeps a position inside the Campus Boundary and pushes it to whoever may see the User now. One outside, or inside
  // one of the User's Private Zones, is not kept, and clears the one stored.
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
    const offCampus = !this.campusBoundary.contains({ latitude, longitude });
    if (offCampus || (await this.privateZones.hide(userId, { latitude, longitude }))) {
      await this.clearPosition(userId);
      return { offCampus, privateZone: !offCampus };
    }
    const placeId = this.places.at({ latitude, longitude })?.place.id ?? null;
    await this.keep(userId, { latitude, longitude, measuredAt: measured.toISOString(), placeId });
    return { offCampus: false, privateZone: false };
  }

  async visiblePositions(viewerId: string): Promise<PositionDto[]> {
    return [...(await this.visibility.visibleTo(viewerId)).values()];
  }

  // Also when the User's session ends, so that the phone's last position does not linger.
  clearPosition(userId: string): Promise<void> {
    return this.visibility.announceRemovals(userId, () => this.positions.clear(userId));
  }

  // Stores the position and pushes it to whoever may see the User now: the position to a viewer at 'exact', and to one
  // at 'building' the Place when it differs from the Place stored before, or again once PLACE_RENEWAL_MS has passed so
  // that the app does not dim the Avatar of a User who stays in one building, or `position-removed` when the User has
  // left every Place.
  private async keep(userId: string, uploaded: Omit<StoredPosition, 'placeToldAt'>): Promise<void> {
    const before = (await this.positions.read([userId])).get(userId);
    const placeChanged = uploaded.placeId !== (before?.placeId ?? null);
    const told = before?.placeToldAt ?? null;
    const renewal =
      uploaded.placeId !== null && (told === null || ageMs(told, uploaded.measuredAt) >= PLACE_RENEWAL_MS);
    const tells = placeChanged || renewal;
    const position = { ...uploaded, placeToldAt: tells ? uploaded.measuredAt : (before?.placeToldAt ?? null) };
    await this.positions.store(userId, position);
    const viewers = [...(await this.visibility.viewersOf(userId))];
    const at = (level: SeenLevel): string[] => viewers.filter(([, seen]) => seen === level).map(([id]) => id);
    this.signals.send(at('exact'), 'position', this.visibility.shown(userId, 'exact', position));
    if (tells) {
      const place = this.visibility.shown(userId, 'building', position);
      this.signals.send(at('building'), place === null ? 'position-removed' : 'position', place ?? { userId });
    }
  }
}
