/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { CampusBoundary } from '../common/campus-boundary.js';
import { type Position } from '../common/geometry.js';
import { PrismaService } from '../common/prisma.service.js';
import { type PrivateZone } from '../generated/prisma/client.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { conflict, notFound } from '../quests/refusals.js';
import { UsersService } from '../users/users.service.js';
import { type PrivateZoneDto, type PrivateZonesDto, storedOutlineSchema } from './dto/private-zone.dto.js';
import { PositionStore } from './position-store.js';
import { outlineOf, zoneHolds, zoneLabel } from './private-zone-outline.js';
import { VisibilityService } from './visibility.service.js';

export const PRIVATE_ZONES_MAX = 5;

const toPrivateZoneDto = ({ id, label, outline, createdAt }: PrivateZone): PrivateZoneDto => ({
  id,
  label,
  outline: storedOutlineSchema.parse(outline),
  createdAt: createdAt.toISOString(),
});

// A User's Private Zones, which no one else reads: inside one, their position is not kept.
@Injectable()
export class PrivateZonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campusBoundary: CampusBoundary,
    private readonly places: PlaceLookup,
    private readonly positions: PositionStore,
    private readonly visibility: VisibilityService,
    private readonly users: UsersService,
  ) {}

  // The oldest first.
  async list(userId: string): Promise<PrivateZonesDto> {
    const zones = await this.prisma.privateZone.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return { zones: zones.map((zone) => toPrivateZoneDto(zone)) };
  }

  // A new zone round the User's stored position clears it at once.
  async add(userId: string, body: unknown): Promise<PrivateZoneDto> {
    const outline = outlineOf(body, this.campusBoundary);
    const label = zoneLabel(outline, (position) => this.places.nearTo(position));
    const zone = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      if ((await tx.privateZone.count({ where: { userId } })) >= PRIVATE_ZONES_MAX) {
        throw conflict('PRIVATE_ZONES_FULL', `A User keeps at most ${PRIVATE_ZONES_MAX} Private Zones.`);
      }
      return tx.privateZone.create({ data: { userId, label, outline } });
    });
    const stored = (await this.positions.read([userId])).get(userId);
    if (stored !== undefined && zoneHolds(outline, stored)) {
      await this.visibility.announceRemovals(userId, () => this.positions.clear(userId));
    }
    return toPrivateZoneDto(zone);
  }

  // A deleted zone hides nothing more, and the User shows again from their next upload outside every zone.
  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.privateZone.deleteMany({ where: { id, userId } });
    if (count === 0) {
      throw notFound('PRIVATE_ZONE_NOT_FOUND', 'This User has no such Private Zone.');
    }
  }

  // One indexed read on each upload, without a cache.
  async hide(userId: string, position: Position): Promise<boolean> {
    const zones = await this.prisma.privateZone.findMany({ where: { userId }, select: { outline: true } });
    return zones.some(({ outline }) => zoneHolds(storedOutlineSchema.parse(outline), position));
  }
}
