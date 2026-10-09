/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-30  Opus 5.5   prompted by fyoon46
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { withAccessToken } from './sign-in.js';

export function getProfile(app: INestApplication<Server>, accessToken?: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/users/me/profile'), accessToken);
}

export function patchProfile(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  body: object,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).patch('/users/me/profile'), accessToken).send(body);
}
