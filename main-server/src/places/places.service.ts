/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { Place } from '../generated/prisma/client.js';
import { AdminPlaceDto, toAdminPlaceDto } from './dto/admin-place.dto.js';
import { PlaceDto, toPlaceDto } from './dto/place.dto.js';

// `25-1` comes after `25` and before `26`, and Korean names in the order a User reads them.
const koreanOrder = new Intl.Collator('ko', { numeric: true });

export function byNumber(a: Place, b: Place): number {
  if (a.number !== null && b.number !== null) {
    return koreanOrder.compare(a.number, b.number);
  }
  if (a.number === null && b.number === null) {
    return koreanOrder.compare(a.name, b.name);
  }
  return a.number === null ? 1 : -1;
}

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PlaceDto[]> {
    const places = await this.prisma.place.findMany();
    return places.toSorted(byNumber).map((place) => toPlaceDto(place));
  }

  async listForAdministrators(): Promise<AdminPlaceDto[]> {
    const places = await this.prisma.place.findMany();
    return places.toSorted(byNumber).map((place) => toAdminPlaceDto(place));
  }

  // In memory: the list is a few hundred entries, and `q` is then no LIKE pattern whose `%` and `_` need escaping.
  async search(text: string): Promise<PlaceDto[]> {
    const part = text.toLowerCase();
    // A User writes the number 302 as 302동.
    const number = text.replace(/동$/u, '');
    return (await this.list()).filter((place) => place.name.toLowerCase().includes(part) || place.number === number);
  }
}
