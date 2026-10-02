import { z } from 'zod';
import { Meal, MenuLineKind, Source } from '../../generated/prisma/client.js';

const menuLineSchema = z.strictObject({
  meal: z.enum(Meal),
  text: z.string().min(1),
  kind: z.enum(MenuLineKind).nullable(),
  name: z.string().min(1).nullable(),
  // The column's range, so that a larger price is refused here rather than failing in the database.
  price: z.int32().nonnegative().nullable(),
});

const restaurantSchema = z.strictObject({
  name: z.string().min(1),
  lines: z.array(menuLineSchema),
});

const daySchema = z.strictObject({
  date: z.iso.date(),
  // Every restaurant the page lists for the day. Storing replaces the Source's day with them.
  restaurants: z
    .array(restaurantSchema)
    .refine(
      (restaurants) => new Set(restaurants.map(({ name }) => name)).size === restaurants.length,
      'Each restaurant must appear once',
    ),
});

// What one Collection of a menu Source read, sent by the worker as `menus-collected`.
export const menusCollectedSchema = z.strictObject({
  source: z.enum([Source.coop_menus, Source.dormitory_menus, Source.veterinary_menus]),
  collectedAt: z.iso.datetime({ offset: true }),
  days: z
    .array(daySchema)
    .refine((days) => new Set(days.map(({ date }) => date)).size === days.length, 'Each day must appear once'),
});

export type MenusCollectedMessage = z.infer<typeof menusCollectedSchema>;
