/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, ConflictException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CampusBoundary } from '../common/campus-boundary.js';
import { type Position } from '../common/geometry.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { type PlaceDto } from '../places/dto/place.dto.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { shownMinutes, TRAVEL_PROVIDER, type TravelProvider } from '../travel/travel.js';
import { SeenPositionDto, UploadedPositionDto, UploadPositionDto } from './dto/position.dto.js';
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

// Told of each position kept, after it is stored. It must not throw.
export type KeptListener = (userId: string, position: Position) => void;

@Injectable()
export class LocationSharingService {
  private readonly kept: KeptListener[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly campusBoundary: CampusBoundary,
    private readonly positions: PositionStore,
    private readonly visibility: VisibilityService,
    private readonly signals: SignalsService,
    private readonly places: PlaceLookup,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
    private readonly privateZones: PrivateZonesService,
  ) {}

  onKept(listener: KeptListener): void {
    this.kept.push(listener);
  }

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

  // Each position the viewer sees, with the Place nearest it and the walk to it from the Place nearest the viewer.
  async visiblePositions(viewerId: string): Promise<SeenPositionDto[]> {
    const [seen, own] = await Promise.all([this.visibility.visibleTo(viewerId), this.positions.read([viewerId])]);
    const from = this.nearestPlace(own.get(viewerId));
    const answered: SeenPositionDto[] = [];
    for (const position of seen.values()) {
      const near = position.level === 'building' ? this.places.byId(position.placeId) : this.nearestPlace(position);
      answered.push({
        ...position,
        nearPlace: near?.name ?? null,
        walkMinutes: from === null || near === null ? null : this.walkMinutes(from.id, near.id),
      });
    }
    return answered;
  }

  // Also when the User's session ends, so that the phone's last position does not linger.
  clearPosition(userId: string): Promise<void> {
    return this.visibility.announceRemovals(userId, () => this.positions.clear(userId));
  }

  // The Place a position is in or next to, or else the one whose point is nearest within NEAREST_PLACE_METRES.
  private nearestPlace(position: Position | undefined): PlaceDto | null {
    return position === undefined ? null : (this.places.at(position)?.place ?? this.places.nearTo(position));
  }

  private walkMinutes(fromPlaceId: string, toPlaceId: string): number | null {
    if (fromPlaceId === toPlaceId) {
      return 0;
    }
    try {
      const seconds = this.travel.walkingSeconds(fromPlaceId, toPlaceId);
      return Number.isFinite(seconds) ? shownMinutes(seconds) : null;
    } catch {
      // The walking table throws for a Place it has no row for. ADR 0010 makes that an error, which the test of the
      // committed table catches for the seeded Places; a Place an Administrator adds before the table is rebuilt
      // would still have none. Here it leaves one walk unknown rather than fail every Friend's positions.
      return null;
    }
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
    this.kept.forEach((listener) => {
      listener(userId, { latitude: uploaded.latitude, longitude: uploaded.longitude });
    });
    const viewers = [...(await this.visibility.viewersOf(userId))];
    const at = (level: SeenLevel): string[] => viewers.filter(([, seen]) => seen === level).map(([id]) => id);
    this.signals.send(at('exact'), 'position', this.visibility.shown(userId, 'exact', position));
    if (tells) {
      const place = this.visibility.shown(userId, 'building', position);
      this.signals.send(at('building'), place === null ? 'position-removed' : 'position', place ?? { userId });
    }
  }
}
