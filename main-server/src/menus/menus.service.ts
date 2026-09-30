import { Injectable } from '@nestjs/common';
import { CollectionService } from '../collection/collection.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { type MenusCollectedMessage } from './dto/menus-collected.dto.js';
import { RestaurantMenusDto, toRestaurantMenusDto } from './dto/restaurant-menus.dto.js';

// A `date` column holds the calendar day of the Date in UTC.
function calendarDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

@Injectable()
export class MenusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collection: CollectionService,
  ) {}

  // Replaces the source's menus on each day the message carries, so a repeat leaves one set of records, and a menu or a
  // restaurant the page dropped does not linger.
  async store({ source, collectedAt, menus }: MenusCollectedMessage): Promise<void> {
    const collected = new Date(collectedAt);
    const sourceDays = {
      source,
      date: { in: [...new Set(menus.map(({ date }) => date))].map((date) => calendarDay(date)) },
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.menuEntry.deleteMany({ where: { restaurantDay: sourceDays } });
      await tx.restaurantDay.deleteMany({ where: sourceDays });
      // RETURNING gives the rows in the order they were inserted.
      const days = await tx.restaurantDay.createManyAndReturn({
        data: menus.map(({ restaurant, date, operatingHours }) => ({
          source,
          restaurant,
          date: calendarDay(date),
          operatingHours,
          collectedAt: collected,
        })),
        select: { id: true },
      });
      await tx.menuEntry.createMany({
        data: menus.flatMap(({ entries }, index) =>
          entries.map(({ meal, name, price }, position) => ({
            restaurantDayId: days[index].id,
            meal,
            name,
            price,
            position,
          })),
        ),
      });
      await this.collection.recordSuccess(tx, source, collected);
    });
  }

  async findByDate(date: string): Promise<RestaurantMenusDto[]> {
    const days = await this.prisma.restaurantDay.findMany({
      where: { date: calendarDay(date) },
      orderBy: { restaurant: 'asc' },
      include: { entries: { orderBy: { position: 'asc' } } },
    });
    return days.map((day) => toRestaurantMenusDto(day));
  }
}
