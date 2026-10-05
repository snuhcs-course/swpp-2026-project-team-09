import { z } from 'zod';
import { JoinPolicy } from '../../generated/prisma/client.js';

export const openPartySchema = z.strictObject({
  title: z.string().trim().min(1).max(50),
  capacity: z.int().min(1).max(8).default(4),
  joinPolicy: z.enum(JoinPolicy).default(JoinPolicy.closed),
  // The Party's Quest: one of the opener's Quests. Left out is the same as null.
  questId: z.uuid().nullable().default(null),
});

export type OpenPartyDto = z.infer<typeof openPartySchema>;
