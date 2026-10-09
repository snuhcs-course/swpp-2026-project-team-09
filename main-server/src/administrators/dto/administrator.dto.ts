// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by fyoon46, reviewed by TaeHyun79 in #14
import { Administrator } from '../../generated/prisma/client.js';

export interface AdministratorDto {
  id: string;
  email: string;
  signedIn: boolean;
}

export function toAdministratorDto({ id, email, googleSubject }: Administrator): AdministratorDto {
  return { id, email, signedIn: googleSubject !== null };
}
