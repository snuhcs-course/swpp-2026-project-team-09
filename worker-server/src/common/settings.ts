/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
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
  // Whether the schedule starts extra.snu's Collections is no setting here: the worker asks the main server's global
  // setting collection.extraSnu before each one (src/event/extra-snu.collector.ts).
  // How the server prints its log: "text" is NestJS's coloured text, "json" one JSON line per entry, as Production's
  // log collector reads them (main-server README: Logging). src/common/logger.ts reads it before the application is
  // created.
  LOG_FORMAT: z.enum(['text', 'json']).default('text'),
});

export type Settings = z.infer<typeof settingsSchema>;
