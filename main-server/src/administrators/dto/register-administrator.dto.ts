/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';

export const registerAdministratorSchema = z.object({
  email: z.email(),
});

export type RegisterAdministratorDto = z.infer<typeof registerAdministratorSchema>;
