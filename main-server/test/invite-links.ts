/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';

export function postInviteLink(app: INestApplication<Server>, user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/invite-links'), user.accessToken);
}

const createdSchema = z.object({ url: z.string(), expiresAt: z.string() });

// Creates an Invite Link and answers the token at the end of its address.
export async function createInviteLink(app: INestApplication<Server>, sender: TestUser): Promise<string> {
  const response = await postInviteLink(app, sender);
  if (response.status !== 201) {
    throw new Error(`Creating an Invite Link answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  const token = createdSchema.parse(response.body).url.split('/').at(-1);
  if (token === undefined) {
    throw new Error('The Invite Link has no token');
  }
  return token;
}

export function getInviteLink(app: INestApplication<Server>, user: TestUser, token: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).get(`/invite-links/${token}`), user.accessToken);
}

export function acceptInviteLink(app: INestApplication<Server>, user: TestUser, token: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post(`/invite-links/${token}/accept`), user.accessToken);
}

export function inviteLinkTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Moves the stored expiry of an Invite Link, as if it had been created at another time.
export async function setInviteLinkExpiry(prisma: PrismaClient, token: string, expiresAt: Date): Promise<void> {
  await prisma.inviteLink.update({ where: { tokenHash: inviteLinkTokenHash(token) }, data: { expiresAt } });
}
