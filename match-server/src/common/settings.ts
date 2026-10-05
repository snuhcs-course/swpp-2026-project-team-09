import { z } from 'zod';

const port = z.string().pipe(z.coerce.number<string>().int().min(1).max(65535));

// Every setting arrives as a string from the environment; the schema converts it to the type the code uses.
export const settingsSchema = z.object({
  PORT: port,
  DATABASE_URL: z.url(),
  // The secret that the main server and this server send with each call to the other. Long enough not to be guessed.
  MATCH_SERVER_TOKEN: z.string().min(32),
});

export type Settings = z.infer<typeof settingsSchema>;
