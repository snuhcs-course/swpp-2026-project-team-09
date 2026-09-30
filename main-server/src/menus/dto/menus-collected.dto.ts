import { z } from 'zod';
import { CollectionSource, Meal, MenuLineKind } from '../../generated/prisma/client.js';

const menuLineSchema = z.strictObject({
  meal: z.enum(Meal),
  text: z.string().min(1),
  kind: z.enum(MenuLineKind).nullable(),
  // The column's range, so that a larger price is refused here rather than failing in the database.
  price: z.int32().nonnegative().nullable(),
});

const restaurantMenusSchema = z.strictObject({
  restaurant: z.string().min(1),
  date: z.iso.date(),
  lines: z.array(menuLineSchema),
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
