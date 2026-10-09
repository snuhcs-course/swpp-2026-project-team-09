// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #46 #47
import { z } from 'zod';
import { JoinPolicy } from '../../generated/prisma/client.js';

const titleSchema = z.string().trim().min(1).max(50);

const capacitySchema = z.int().min(1).max(8);

export const openPartySchema = z.strictObject({
  title: titleSchema,
  capacity: capacitySchema.default(4),
  joinPolicy: z.enum(JoinPolicy).default(JoinPolicy.closed),
  // The Party's Quest: one of the opener's Quests. Left out is the same as null.
  questId: z.uuid().nullable().default(null),
});

export type OpenPartyDto = z.infer<typeof openPartySchema>;

// The Leader's settings. A field left out stays as it is; the Party's Quest never changes.
export const updatePartySchema = z.strictObject({
  title: titleSchema.optional(),
  capacity: capacitySchema.optional(),
  joinPolicy: z.enum(JoinPolicy).optional(),
});

export type UpdatePartyDto = z.infer<typeof updatePartySchema>;

// A member of the Leader's Party, or a User the Leader invites, named by their User id.
export const userIdSchema = z.strictObject({ userId: z.uuid() });

export type UserIdDto = z.infer<typeof userIdSchema>;
