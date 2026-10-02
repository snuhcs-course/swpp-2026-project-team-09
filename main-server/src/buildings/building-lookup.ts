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

interface Measured {
  // The outline that decided the distance, or none when the building has no outline.
  outline: Position[] | null;
  metres: number;
}

// A building is as far as the wall of its nearest outline, and at no distance when one of its outlines holds the
// position. Without an outline it is as far as its own position.
function measure(building: Position, outlines: Position[][], position: Position): Measured {
  let nearest: Measured = { outline: null, metres: Number.POSITIVE_INFINITY };
  for (const outline of outlines) {
    const metres = encloses(outline, position) ? 0 : metresToRing(outline, position);
    if (metres < nearest.metres) {
      nearest = { outline, metres };
    }
  }
  return nearest.outline === null ? { outline: null, metres: metresBetween(building, position) } : nearest;
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

const outlinesSchema = z.array(z.array(z.object({ latitude: z.number(), longitude: z.number() })));

// Which building a position is in. Inject it wherever a feature turns a User's position into a place.
@Injectable()
export class BuildingLookup implements OnModuleInit {
  private buildings: { building: BuildingDto; outlines: Position[][] }[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // The seed is loaded before the server starts, so the buildings are read once and a position is answered without a
  // database query.
  async onModuleInit(): Promise<void> {
    const buildings = await this.prisma.building.findMany();
    const copies = new Map<string, Position[]>();
    this.buildings = buildings.toSorted(byNumber).map((building) => ({
      building: toBuildingDto(building),
      outlines: outlinesSchema.parse(building.outlines).map((outline) => oneCopy(copies, outline)),
    }));
  }

  // The nearest building, each as far as measure() says. Within INSIDE_WITHIN_METRES of its wall the position is
  // inside it, and within NEAR_WITHIN_METRES near it. A place or a building without an outline can only be near.
  at(position: Position): NearestBuilding | null {
    let nearest: (Measured & { building: BuildingDto }) | null = null;
    for (const { building, outlines } of this.buildings) {
      const { outline, metres } = measure(building, outlines, position);
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
