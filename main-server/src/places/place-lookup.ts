import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { encloses, metresBetween, metresToRing, type Position } from '../common/geometry.js';
import { PrismaService } from '../common/prisma.service.js';
import { byNumber } from './places.service.js';
import { PlaceDto, toPlaceDto } from './dto/place.dto.js';

export interface NearestPlace {
  place: PlaceDto;
  relation: 'inside' | 'near';
}

// A phone inside a Place is often placed just outside its walls.
const INSIDE_WITHIN_METRES = 5;

const NEAR_WITHIN_METRES = 20;

interface Measured {
  // The outline that decided the distance, or none when the Place has no outline.
  outline: Position[] | null;
  metres: number;
}

// A Place is as far as the wall of its nearest outline, and at no distance when one of its outlines holds the
// position. Without an outline it is as far as its own position.
function measure(place: Position, outlines: Position[][], position: Position): Measured {
  let nearest: Measured = { outline: null, metres: Number.POSITIVE_INFINITY };
  for (const outline of outlines) {
    const metres = encloses(outline, position) ? 0 : metresToRing(outline, position);
    if (metres < nearest.metres) {
      nearest = { outline, metres };
    }
  }
  return nearest.outline === null ? { outline: null, metres: metresBetween(place, position) } : nearest;
}

// The Places that share an outline hold one copy of it, so that at() knows them by it.
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

// Which Place a position is in. Inject it wherever a feature turns a User's position into a Place.
@Injectable()
export class PlaceLookup implements OnModuleInit {
  private places: { place: PlaceDto; outlines: Position[][] }[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // The seed is loaded before the server starts, so the Places are read once and a position is answered without a
  // database query.
  async onModuleInit(): Promise<void> {
    const places = await this.prisma.place.findMany();
    const copies = new Map<string, Position[]>();
    this.places = places.toSorted(byNumber).map((place) => ({
      place: toPlaceDto(place),
      outlines: outlinesSchema.parse(place.outlines).map((outline) => oneCopy(copies, outline)),
    }));
  }

  at(position: Position): NearestPlace | null {
    let nearest: (Measured & { place: PlaceDto }) | null = null;
    for (const { place, outlines } of this.places) {
      const { outline, metres } = measure(place, outlines, position);
      // At the same distance the earlier Place of the list stays, except among the Places of one outline, where
      // the one whose position is nearer wins.
      const nearer =
        nearest === null ||
        metres < nearest.metres ||
        (outline !== null &&
          outline === nearest.outline &&
          metresBetween(place, position) < metresBetween(nearest.place, position));
      if (nearer) {
        nearest = { place, outline, metres };
      }
    }
    if (nearest === null || nearest.metres > NEAR_WITHIN_METRES) {
      return null;
    }
    const inside = nearest.outline !== null && nearest.metres <= INSIDE_WITHIN_METRES;
    return { place: nearest.place, relation: inside ? 'inside' : 'near' };
  }
}
