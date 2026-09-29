import { Administrator } from '../../generated/prisma/client.js';

// An Administrator as the admin site lists them.
export interface AdministratorDto {
  id: string;
  email: string;
  // Whether they have signed in yet. The first sign-in binds their Google account.
  signedIn: boolean;
}

export function toAdministratorDto({ id, email, googleSubject }: Administrator): AdministratorDto {
  return { id, email, signedIn: googleSubject !== null };
}
