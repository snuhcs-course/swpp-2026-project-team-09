/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Prisma } from '../generated/prisma/client.js';

// Why a database write failed, for the log: the error's name and Prisma's code, never its message, which can hold the
// values written, such as a User's words.
export function databaseCauseOf(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `${error.name} ${error.code}`;
  }
  return error instanceof Error ? error.name : typeof error;
}
