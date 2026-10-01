import { Injectable } from '@nestjs/common';
import { CollectionService } from '../collection/collection.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { type MenusCollectedMessage } from './dto/menus-collected.dto.js';
import { RestaurantMenusDto, toRestaurantMenusDto } from './dto/restaurant-menus.dto.js';

// A `date` column holds the calendar day of the Date in UTC.
function calendarDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

// The database's collation, en_US, does not order Korean names as a User reads them.
const koreanOrder = new Intl.Collator('ko');

@Injectable()
export class MenusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collection: CollectionService,
  ) {}

  // Replaces what the Source stored for each day the message carries, so that a repeat leaves one set of records and a
  // restaurant the page dropped or renamed does not linger.
  async store({ source, collectedAt, days }: MenusCollectedMessage): Promise<void> {
    const collected = new Date(collectedAt);
    const restaurants = days.flatMap((day) =>
      day.restaurants.map(({ name, lines }) => ({ date: calendarDay(day.date), name, lines })),
    );
    await this.prisma.$transaction(async (tx) => {
      await this.collection.recordSuccess(tx, source, collected);
      await tx.restaurantDay.deleteMany({
        where: { source, date: { in: days.map(({ date }) => calendarDay(date)) } },
      });
      // RETURNING gives the rows in the order they were inserted.
      const stored = await tx.restaurantDay.createManyAndReturn({
        data: restaurants.map(({ date, name }) => ({ source, date, restaurant: name, collectedAt: collected })),
        select: { id: true },
      });
      await tx.menuLine.createMany({
        data: restaurants.flatMap(({ lines }, index) =>
          lines.map(({ meal, text, kind, price, name }, position) => ({
            restaurantDayId: stored[index].id,
            position,
            meal,
            text,
            kind,
            price,
            name,
          })),
        ),
      });
    });
  }

  async findByDate(date: string): Promise<RestaurantMenusDto[]> {
    const days = await this.prisma.restaurantDay.findMany({
      where: { date: calendarDay(date) },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
    return days
      .toSorted((a, b) => koreanOrder.compare(a.restaurant, b.restaurant))
      .map((day) => toRestaurantMenusDto(day));
  }
}
