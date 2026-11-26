/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { withAccessToken } from './sign-in.js';

export function putConsent(app: INestApplication<Server>, accessToken: string | undefined, body: object): request.Test {
  return withAccessToken(request(app.getHttpServer()).put('/users/me/consent'), accessToken).send(body);
}

export function putUsageConsent(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  body: object,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).put('/users/me/usage-consent'), accessToken).send(body);
}

// The account's consent as the Lobby answers it.
export async function lobbyConsentOf(app: INestApplication<Server>, accessToken: string): Promise<unknown> {
  const response = await withAccessToken(request(app.getHttpServer()).post('/lobby'), accessToken);
  expect(response.status).toBe(200);
  return z.object({ consent: z.unknown() }).parse(response.body).consent;
}

export interface StoredConsentRow {
  consentVersion: number | null;
  usageConsent: boolean | null;
  consentedAt: Date | null;
  usageChosenAt: Date | null;
}

// The four columns of the account of this Google subject, as stored.
export function storedConsentOf(prisma: PrismaClient, sub: string): Promise<StoredConsentRow> {
  return prisma.user.findUniqueOrThrow({
    where: { googleSubject: sub },
    select: { consentVersion: true, usageConsent: true, consentedAt: true, usageChosenAt: true },
  });
}
