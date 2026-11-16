/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-02  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

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

const timeOfDaySchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u, 'Expected a time of day, HH:MM');

// A meal's hours, which the worker read from the one hours line of the meal's cell.
const mealHoursSchema = z.strictObject({
  meal: z.enum(Meal),
  opensAt: timeOfDaySchema,
  closesAt: timeOfDaySchema,
  line: z.string().min(1),
});

const restaurantSchema = z.strictObject({
  name: z.string().min(1),
  lines: z.array(menuLineSchema),
  // A message without them, as from a worker that does not read hours, keeps the hours as they are.
  hours: z
    .array(mealHoursSchema)
    .refine((hours) => new Set(hours.map(({ meal }) => meal)).size === hours.length, 'Each meal must appear once')
    .default([]),
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

// What one Collection of a menu Source read, posted by the worker to `/menus/collected`.
export const menusCollectedSchema = z.strictObject({
  source: z.enum([Source.coop_menus, Source.dormitory_menus, Source.veterinary_menus]),
  collectedAt: z.iso.datetime({ offset: true }),
  days: z
    .array(daySchema)
    .refine((days) => new Set(days.map(({ date }) => date)).size === days.length, 'Each day must appear once'),
});

export type MenusCollectedMessage = z.infer<typeof menusCollectedSchema>;
