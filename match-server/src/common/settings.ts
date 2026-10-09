// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-10-06, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #4 #8 #45 #48
import { z } from 'zod';

const port = z.string().pipe(z.coerce.number<string>().int().min(1).max(65535));

// Every setting arrives as a string from the environment; the schema converts it to the type the code uses.
export const settingsSchema = z.object({
  PORT: port,
  DATABASE_URL: z.url(),
  // The secret that the main server and this server send with each call to the other. Long enough not to be guessed.
  MATCH_SERVER_TOKEN: z.string().min(32),
  // Where the main server is reached, such as http://localhost:3000.
  MAIN_SERVER_URL: z.url(),
  // The seconds from one round to the next.
  ROUND_INTERVAL_SECONDS: z.string().pipe(z.coerce.number<string>().int().min(1)),
});

export type Settings = z.infer<typeof settingsSchema>;
