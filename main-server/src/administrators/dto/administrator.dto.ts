import { Administrator } from '../../generated/prisma/client.js';

export interface AdministratorDto {
  id: string;
  email: string;
  signedIn: boolean;
}

export function toAdministratorDto({ id, email, googleSubject }: Administrator): AdministratorDto {
  return { id, email, signedIn: googleSubject !== null };
}
