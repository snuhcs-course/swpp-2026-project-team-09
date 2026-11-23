/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';

export const logTestSchema = z.object({
  level: z.enum(['info', 'warn', 'error']),
});

export type LogTestDto = z.infer<typeof logTestSchema>;
