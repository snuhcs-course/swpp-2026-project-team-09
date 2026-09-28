import { z } from 'zod';

const port = z.string().pipe(z.coerce.number<string>().int().min(1).max(65535));

// Every setting arrives as a string from the environment; the schema converts it to the type the code uses.
export const settingsSchema = z.object({
  PORT: port,
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: port,
});

export type Settings = z.infer<typeof settingsSchema>;
