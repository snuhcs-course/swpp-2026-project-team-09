import { z } from 'zod';

const port = z.string().pipe(z.coerce.number<string>().int().min(1).max(65535));

// Every setting arrives as a string from the environment; the schema converts it to the type the code uses.
export const settingsSchema = z.object({
  PORT: port,
  // Where the main server is reached, such as http://localhost:3000.
  MAIN_SERVER_URL: z.url(),
  // The secret that the main server expects with what the worker sends: the main server's WORKER_TOKEN.
  WORKER_TOKEN: z.string().min(32),
});

export type Settings = z.infer<typeof settingsSchema>;
