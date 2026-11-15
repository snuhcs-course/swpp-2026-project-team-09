/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { DayKind, Meal, Prisma } from '../generated/prisma/client.js';
import { type MenusCollectedMessage } from './dto/menus-collected.dto.js';

export interface Hours {
  // Times of day in Asia/Seoul, "HH:MM".
  opensAt: string;
  closesAt: string;
}

// The kind of day of a calendar day in Asia/Seoul, "YYYY-MM-DD". The project keeps no calendar of public holidays, so
// a holiday is read by its day of the week; on one, the pages write the closure in the cell (ADR 0011).
export function dayKindOf(date: string): DayKind {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (day === 0) {
    return DayKind.sunday;
  }
  return day === 6 ? DayKind.saturday : DayKind.weekday;
}

function keyOf({ restaurant, meal, dayKind }: { restaurant: string; meal: Meal; dayKind: DayKind }): string {
  return JSON.stringify([restaurant, meal, dayKind]);
}

// Each Restaurant's hours, kept beside its menus (docs/adr/0001-menus-kept-as-lines.md).
@Injectable()
export class RestaurantHours {
  constructor(private readonly prisma: PrismaService) {}

  // Keeps the hours a Collection read, for each Restaurant, meal and kind of day the earliest day's, and writes only
  // those whose times differ from the kept ones. A day without hours changes nothing.
  async keep(tx: Prisma.TransactionClient, { source, collectedAt, days }: MenusCollectedMessage): Promise<void> {
    const read = new Map<string, Hours & { restaurant: string; meal: Meal; dayKind: DayKind; line: string }>();
    for (const { date, restaurants } of days.toSorted((a, b) => a.date.localeCompare(b.date))) {
      for (const { name, hours } of restaurants) {
        for (const mealHours of hours) {
          const row = { ...mealHours, restaurant: name, dayKind: dayKindOf(date) };
          if (!read.has(keyOf(row))) {
            read.set(keyOf(row), row);
          }
        }
      }
    }
    if (read.size === 0) {
      return;
    }
    const kept = new Map(
      (await tx.restaurantHours.findMany({ where: { source } })).map((row) => [keyOf(row), row] as const),
    );
    const changed = [...read.values()].filter((row) => {
      const keptRow = kept.get(keyOf(row));
      return keptRow?.opensAt !== row.opensAt || keptRow.closesAt !== row.closesAt;
    });
    const readAt = new Date(collectedAt);
    await Promise.all(
      changed.map(({ restaurant, meal, dayKind, opensAt, closesAt, line }) =>
        tx.restaurantHours.upsert({
          where: { source_restaurant_meal_dayKind: { source, restaurant, meal, dayKind } },
          create: { source, restaurant, meal, dayKind, opensAt, closesAt, line, readAt },
          update: { opensAt, closesAt, line, readAt },
        }),
      ),
    );
  }

  // A Restaurant's hours for a meal on `date`, a calendar day in Asia/Seoul, as its page last gave them for that kind of
  // day; null when it never did. `restaurant` is the name `GET /menus` gives.
  hoursOf(restaurant: string, meal: Meal, date: string): Promise<Hours | null> {
    return this.prisma.restaurantHours.findFirst({
      where: { restaurant, meal, dayKind: dayKindOf(date) },
      select: { opensAt: true, closesAt: true },
      orderBy: { readAt: 'desc' },
    });
  }
}
