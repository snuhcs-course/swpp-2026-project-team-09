/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-02  Opus 5.5   prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CollectionService } from '../collection/collection.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { type Meal, MenuLineKind } from '../generated/prisma/client.js';
import { type MenusCollectedMessage } from './dto/menus-collected.dto.js';
import { type Cuisines } from './cuisine-words.js';
import { type MenuLineDto, RestaurantMenusDto, toRestaurantMenusDto } from './dto/restaurant-menus.dto.js';
import { DishCuisines } from './dish-cuisines.js';
import { dishName } from './dish-name.js';
import { type Hours, RestaurantHours } from './restaurant-hours.js';
import { RestaurantPlaces } from './restaurant-places.js';

// A `date` column holds the calendar day of the Date in UTC.
function calendarDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

// The names of the lines that may be dishes: every line but a heading or a note.
function dishNamesOf({ days }: MenusCollectedMessage): string[] {
  return days.flatMap(({ restaurants }) =>
    restaurants.flatMap(({ lines }) =>
      lines.flatMap((line) =>
        line.kind === MenuLineKind.heading || line.kind === MenuLineKind.note ? [] : [dishName(line)],
      ),
    ),
  );
}

// The database's collation, en_US, does not order Korean names as a User reads them.
const koreanOrder = new Intl.Collator('ko');

@Injectable()
export class MenusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collection: CollectionService,
    private readonly places: RestaurantPlaces,
    private readonly hours: RestaurantHours,
    private readonly cuisines: DishCuisines,
  ) {}

  // Replaces what the Source stored for each day the message carries, so that a repeat leaves one set of records and a
  // restaurant the page dropped or renamed does not linger. The hours it carries are not a day's: RestaurantHours keeps
  // them.
  async store(message: MenusCollectedMessage): Promise<void> {
    const { source, collectedAt, days } = message;
    const collected = new Date(collectedAt);
    // The identifiers are made here, so that each line is given its restaurant's without reading it back.
    const restaurants = days.flatMap((day) =>
      day.restaurants.map(({ name, lines }) => ({ id: randomUUID(), date: calendarDay(day.date), name, lines })),
    );
    await this.prisma.$transaction(async (tx) => {
      await this.collection.recordSuccess(tx, source, collected);
      await tx.restaurantDay.deleteMany({
        where: { source, date: { in: days.map(({ date }) => calendarDay(date)) } },
      });
      await tx.restaurantDay.createMany({
        data: restaurants.map(({ id, date, name }) => ({ id, source, date, restaurant: name, collectedAt: collected })),
      });
      await tx.menuLine.createMany({
        data: restaurants.flatMap(({ id, lines }) =>
          lines.map(({ meal, text, kind, name, price }, position) => ({
            restaurantDayId: id,
            position,
            meal,
            text,
            kind,
            name,
            price,
          })),
        ),
      });
      await this.hours.keep(tx, message);
    });
    // The worker waits a few seconds for the answer: the kinds of food of new dishes are read after it.
    void this.cuisines.readNew(dishNamesOf(message));
  }

  // The kept kinds of food of these dishes, by their names (dishName).
  cuisinesOf(lines: readonly MenuLineDto[]): Promise<Cuisines> {
    return this.cuisines.of(lines.map((line) => dishName(line)));
  }

  // A Restaurant's hours for a meal on `date`, as RestaurantHours keeps them; null when none were kept.
  hoursOf(restaurant: string, meal: Meal, date: string): Promise<Hours | null> {
    return this.hours.hoursOf(restaurant, meal, date);
  }

  async findByDate(date: string): Promise<RestaurantMenusDto[]> {
    const days = await this.prisma.restaurantDay.findMany({
      where: { date: calendarDay(date) },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
    return days
      .toSorted((a, b) => koreanOrder.compare(a.restaurant, b.restaurant))
      .map((day) => toRestaurantMenusDto(day, this.places.placeOf(day.restaurant)?.id ?? null));
  }
}
