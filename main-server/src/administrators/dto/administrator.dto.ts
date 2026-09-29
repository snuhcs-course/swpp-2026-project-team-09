import { Administrator } from '../../generated/prisma/client.js';

// An Administrator as the admin site lists them.
export interface AdministratorDto {
  id: string;
  email: string;
  // Whether they have signed in yet. The first sign-in binds their Google account.
  signedIn: boolean;
  // The email address of the Administrator who registered them, or null for an initial Administrator.
  registeredBy: string | null;
}

export function toAdministratorDto({ id, email, googleSubject, registeredBy }: Administrator): AdministratorDto {
  return { id, email, signedIn: googleSubject !== null, registeredBy };
}
