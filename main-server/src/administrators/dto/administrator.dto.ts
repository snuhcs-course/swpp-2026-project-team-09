/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Administrator } from '../../generated/prisma/client.js';

export interface AdministratorDto {
  id: string;
  email: string;
  signedIn: boolean;
}

export function toAdministratorDto({ id, email, googleSubject }: Administrator): AdministratorDto {
  return { id, email, signedIn: googleSubject !== null };
}
