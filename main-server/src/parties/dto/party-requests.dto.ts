import { z } from 'zod';
import { PartyJoinPolicy } from '../../generated/prisma/client.js';

const titleSchema = z.string().trim().min(1).max(50);

const capacitySchema = z.int().min(1).max(8);

export const createPartySchema = z.strictObject({
  title: titleSchema,
  capacity: capacitySchema.default(4),
  joinPolicy: z.enum(PartyJoinPolicy),
  // The mark: one of the creator's Quests. Left out is the same as null.
  questId: z.uuid().nullable().default(null),
});

export type CreatePartyDto = z.infer<typeof createPartySchema>;

// The Leader's settings. A field left out stays as it is; the mark never changes.
export const updatePartySchema = z.strictObject({
  title: titleSchema.optional(),
  capacity: capacitySchema.optional(),
  joinPolicy: z.enum(PartyJoinPolicy).optional(),
});

export type UpdatePartyDto = z.infer<typeof updatePartySchema>;

// A member of the Leader's Party, or a Friend, named by their User id.
export const userIdSchema = z.strictObject({ userId: z.uuid() });

export type UserIdDto = z.infer<typeof userIdSchema>;
