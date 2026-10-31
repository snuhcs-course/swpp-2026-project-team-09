/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';

const port = z.string().pipe(z.coerce.number<string>().int().min(1).max(65535));

// Every setting arrives as a string from the environment; the schema converts it to the type the code uses.
export const settingsSchema = z.object({
  PORT: port,
  // Where the main server is reached, such as http://localhost:3000.
  MAIN_SERVER_URL: z.url(),
  // The secret that the main server expects with what the worker sends: the main server's WORKER_TOKEN.
  WORKER_TOKEN: z.string().min(32),
  // Whether the schedule starts extra.snu's Collections. It stays off until the rules that keep the same event from
  // showing twice are deployed (infra/production/README.md).
  EXTRA_SNU_COLLECTION: z
    .enum(['on', 'off'])
    .default('off')
    .transform((value) => value === 'on'),
});

export type Settings = z.infer<typeof settingsSchema>;
