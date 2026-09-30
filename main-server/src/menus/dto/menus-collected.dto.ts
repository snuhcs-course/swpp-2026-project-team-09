import { z } from 'zod';
import { CollectionSource, Meal } from '../../generated/prisma/client.js';

const menuEntrySchema = z.strictObject({
  meal: z.enum(Meal),
  name: z.string().min(1),
  // In won; null when the page gives none.
  price: z.int().nonnegative().nullable(),
});

// One restaurant's menus on one day.
const restaurantMenusSchema = z.strictObject({
  restaurant: z.string().min(1),
  // A calendar day in Asia/Seoul.
  date: z.iso.date(),
  operatingHours: z.string().min(1).nullable(),
  entries: z.array(menuEntrySchema),
});

// The menus one collection read, sent by the worker as `menus-collected`.
export const menusCollectedSchema = z.strictObject({
  source: z.enum([CollectionSource.coop_menus, CollectionSource.dormitory_menus, CollectionSource.veterinary_menus]),
  collectedAt: z.iso.datetime({ offset: true }),
  menus: z
    .array(restaurantMenusSchema)
    .refine(
      (menus) => new Set(menus.map(({ restaurant, date }) => `${date} ${restaurant}`)).size === menus.length,
      'Each restaurant and day must appear once',
    ),
});

export type MenusCollectedMessage = z.infer<typeof menusCollectedSchema>;
