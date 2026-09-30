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

  // Replaces each restaurant and day in the message, so a repeat leaves one set of records and a removed menu does not
  // linger.
  async store({ source, collectedAt, menus }: MenusCollectedMessage): Promise<void> {
    const collected = new Date(collectedAt);
    await this.prisma.$transaction(async (tx) => {
      // The transaction's one connection runs them one at a time.
      const days = await Promise.all(
        menus.map(({ restaurant, date, operatingHours }) => {
          const day = { date: calendarDay(date), restaurant };
          return tx.restaurantDay.upsert({
            where: { date_restaurant: day },
            create: { ...day, operatingHours, collectedAt: collected },
            update: { operatingHours, collectedAt: collected },
            select: { id: true },
          });
        }),
      );
      await tx.menuEntry.deleteMany({ where: { restaurantDayId: { in: days.map(({ id }) => id) } } });
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
