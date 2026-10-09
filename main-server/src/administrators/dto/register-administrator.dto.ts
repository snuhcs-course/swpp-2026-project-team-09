// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by fyoon46, reviewed by TaeHyun79 in #14
import { z } from 'zod';

export const registerAdministratorSchema = z.object({
  email: z.email(),
});

export type RegisterAdministratorDto = z.infer<typeof registerAdministratorSchema>;
