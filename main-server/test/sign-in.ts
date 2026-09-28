import { INestApplication } from '@nestjs/common';
import { TokenPayload } from 'google-auth-library';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { googleIdToken } from './google.js';

// The answer to a sign-in, exactly. Parsing a response body with it checks the body.
export const tokensSchema = z.strictObject({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export type Tokens = z.infer<typeof tokensSchema>;

// Signs in as the app does, with a Google ID token for a new SNU account unless claims change it.
export async function signIn(
  app: Readonly<INestApplication<Server>>,
  claims: Readonly<Partial<TokenPayload>> = {},
): Promise<Tokens> {
  const response = await request(app.getHttpServer())
    .post('/auth/google')
    .send({ idToken: googleIdToken(claims) });
  if (response.status !== 200) {
    throw new Error(`Sign-in answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return tokensSchema.parse(response.body);
}

// Exchanges a refresh token as the app does and returns the new tokens.
export async function refresh(app: Readonly<INestApplication<Server>>, refreshToken: string): Promise<Tokens> {
  const response = await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken });
  if (response.status !== 200) {
    throw new Error(`Refresh answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return tokensSchema.parse(response.body);
}
