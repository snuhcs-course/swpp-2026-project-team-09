/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { encloses, metresBetween, metresToRing, type Position } from '../common/geometry.js';
import { PrismaService } from '../common/prisma.service.js';
import { NEAREST_PLACE_METRES } from '../travel/judgement-constants.js';
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

// A place as a Sub Quest holds it: a Place, or a point with the label the app showed, or the label alone.
export interface WrittenPlace {
  placeId: string | null;
  label: string;
  latitude: number | null;
  longitude: number | null;
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

  // The id of the Place a written place is, or null when it is unknown or there is none.
  placeIdOf(written: WrittenPlace | null): string | null {
    if (written === null) {
      return null;
    }
    const { placeId, label, latitude, longitude } = written;
    if (placeId !== null) {
      return placeId;
    }
    const position = latitude === null || longitude === null ? null : { latitude, longitude };
    const place =
      position === null ? null : (this.exactlyAt(position) ?? this.at(position)?.place ?? this.nearTo(position));
    return (place ?? this.named(label))?.id ?? null;
  }

  private exactlyAt({ latitude, longitude }: Position): PlaceDto | null {
    const found = this.places.find(({ place }) => place.latitude === latitude && place.longitude === longitude);
    return found?.place ?? null;
  }

  private nearTo(position: Position): PlaceDto | null {
    const [nearest] = this.places
      .map(({ place }) => ({ place, metres: metresBetween(place, position) }))
      .toSorted((a, b) => a.metres - b.metres);
    return nearest !== undefined && nearest.metres <= NEAREST_PLACE_METRES ? nearest.place : null;
  }

  private named(label: string): PlaceDto | null {
    const found = this.places.find(({ place }) => place.name === label || place.number === label);
    return found?.place ?? null;
  }
}
