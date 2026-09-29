import { z } from 'zod';

export const registerAdministratorSchema = z.object({
  email: z.email(),
});

export type RegisterAdministratorDto = z.infer<typeof registerAdministratorSchema>;
