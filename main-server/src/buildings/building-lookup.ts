import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { encloses, metresBetween, metresToRing, type Position } from '../common/geometry.js';
import { PrismaService } from '../common/prisma.service.js';
import { byNumber } from './buildings.service.js';
import { BuildingDto, toBuildingDto } from './dto/building.dto.js';

export interface NearestBuilding {
  building: BuildingDto;
  relation: 'inside' | 'near';
}

// A phone inside a building is often placed just outside its walls.
const INSIDE_WITHIN_METRES = 5;

const NEAR_WITHIN_METRES = 20;

function metresTo(building: Position, outline: Position[] | null, position: Position): number {
  if (outline === null) {
    return metresBetween(building, position);
  }
  return encloses(outline, position) ? 0 : metresToRing(outline, position);
}

// The buildings that share an outline hold one copy of it, so that at() knows them by it.
function oneCopy(outlines: Map<string, Position[]>, outline: Position[]): Position[] {
  const key = JSON.stringify(outline);
  const known = outlines.get(key);
  if (known !== undefined) {
    return known;
  }
  outlines.set(key, outline);
  return outline;
}

const outlineSchema = z.array(z.object({ latitude: z.number(), longitude: z.number() })).nullable();

// Which building a position is in. Inject it wherever a feature turns a User's position into a place.
@Injectable()
export class BuildingLookup implements OnModuleInit {
  private buildings: { building: BuildingDto; outline: Position[] | null }[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // The seed is loaded before the server starts, so the buildings are read once and a position is answered without a
  // database query.
  async onModuleInit(): Promise<void> {
    const buildings = await this.prisma.building.findMany();
    const outlines = new Map<string, Position[]>();
    this.buildings = buildings.toSorted(byNumber).map((building) => {
      const outline = outlineSchema.parse(building.outline);
      return { building: toBuildingDto(building), outline: outline === null ? null : oneCopy(outlines, outline) };
    });
  }

  // The nearest building, each as far as its wall, or as its position when it has no outline, and at no distance when
  // its outline holds the position. Within INSIDE_WITHIN_METRES of its wall the position is inside it, and within
  // NEAR_WITHIN_METRES near it. A place or a building without an outline can only be near.
  at(position: Position): NearestBuilding | null {
    let nearest: { building: BuildingDto; outline: Position[] | null; metres: number } | null = null;
    for (const { building, outline } of this.buildings) {
      const metres = metresTo(building, outline, position);
      // At the same distance the earlier building of the list stays, except among the buildings of one outline, where
      // the one whose position is nearer wins.
      const nearer =
        nearest === null ||
        metres < nearest.metres ||
        (outline !== null &&
          outline === nearest.outline &&
          metresBetween(building, position) < metresBetween(nearest.building, position));
      if (nearer) {
        nearest = { building, outline, metres };
      }
    }
    if (nearest === null || nearest.metres > NEAR_WITHIN_METRES) {
      return null;
    }
    const inside = nearest.outline !== null && nearest.metres <= INSIDE_WITHIN_METRES;
    return { building: nearest.building, relation: inside ? 'inside' : 'near' };
  }
}
