import { z } from 'zod';
import { PartyJoinPolicy } from '../../generated/prisma/client.js';

export const createPartySchema = z.strictObject({
  title: z.string().trim().min(1).max(50),
  capacity: z.int().min(1).max(8).default(4),
  joinPolicy: z.enum(PartyJoinPolicy),
  // The mark: one of the creator's Quests. Left out is the same as null.
  questId: z.uuid().nullable().default(null),
});

export type CreatePartyDto = z.infer<typeof createPartySchema>;
