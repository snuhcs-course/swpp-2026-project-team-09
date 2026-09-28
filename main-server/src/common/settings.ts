import { z } from 'zod';

// Every setting arrives as a string from the environment; the schema converts it to the type the code uses.
export const settingsSchema = z.object({
  PORT: z.string().pipe(z.coerce.number<string>().int().min(1).max(65535)),
});

export type Settings = z.infer<typeof settingsSchema>;
