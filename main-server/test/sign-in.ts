import { INestApplication } from '@nestjs/common';
import { TokenPayload } from 'google-auth-library';
import { createHash } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { googleIdToken } from './google.js';

// The answer to a sign-in and to a refresh, exactly. Parsing a response body with it checks the body.
export const tokensSchema = z.strictObject({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export type Tokens = z.infer<typeof tokensSchema>;

// Signs in as the app does, with a Google ID token for a new SNU account unless claims change it.
export async function signIn(app: INestApplication<Server>, claims: Partial<TokenPayload> = {}): Promise<Tokens> {
  const response = await request(app.getHttpServer())
    .post('/auth/google')
    .send({ idToken: googleIdToken(claims) });
  if (response.status !== 200) {
    throw new Error(`Sign-in answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return tokensSchema.parse(response.body);
}

export function postRefreshToken(app: INestApplication<Server>, refreshToken: string): request.Test {
  return request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken });
}

// Exchanges a refresh token as the app does and returns the new tokens.
export async function refresh(app: INestApplication<Server>, refreshToken: string): Promise<Tokens> {
  const response = await postRefreshToken(app, refreshToken);
  if (response.status !== 200) {
    throw new Error(`Refresh answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return tokensSchema.parse(response.body);
}

// What the server stores of a refresh token.
export function refreshTokenHash(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

// GET /users/me stands for every route that needs an access token.
export function getMe(app: INestApplication<Server>, accessToken?: string): request.Test {
  const get = request(app.getHttpServer()).get('/users/me');
  return accessToken === undefined ? get : get.auth(accessToken, { type: 'bearer' });
}
