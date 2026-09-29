import { z } from 'zod';

// The email address of the Google account to register, of any Google domain. Case is ignored.
export const registerAdministratorSchema = z.object({
  email: z.email(),
});

export type RegisterAdministratorDto = z.infer<typeof registerAdministratorSchema>;
