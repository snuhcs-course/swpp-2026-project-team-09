import { INestApplication } from '@nestjs/common';
import { TokenPayload } from 'google-auth-library';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { administratorIdToken, googleIdToken, googleSubject } from './google.js';

// The answer to a sign-in, exactly. Parsing a response body with it checks the body.
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

export const administratorTokensSchema = z.strictObject({
  accessToken: z.string().min(1),
});

export type AdministratorTokens = z.infer<typeof administratorTokensSchema>;

// As the initial Administrator unless claims change the account.
export async function signInAsAdministrator(
  app: INestApplication<Server>,
  claims: Partial<TokenPayload> = {},
): Promise<AdministratorTokens> {
  const response = await request(app.getHttpServer())
    .post('/admin/auth/google')
    .send({ idToken: administratorIdToken(claims) });
  if (response.status !== 200) {
    throw new Error(`Administrator sign-in answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return administratorTokensSchema.parse(response.body);
}

export function registerAdministrator(app: INestApplication<Server>, accessToken: string, email: string): request.Test {
  return request(app.getHttpServer())
    .post('/admin/administrators')
    .auth(accessToken, { type: 'bearer' })
    .send({ email });
}

export interface NewAdministrator {
  id: string;
  email: string;
  sub: string;
  accessToken: string;
}

export async function signInAsNewAdministrator(app: INestApplication<Server>): Promise<NewAdministrator> {
  const email = `${randomUUID()}@example.com`;
  const { accessToken: registrarToken } = await signInAsAdministrator(app);
  const response = await registerAdministrator(app, registrarToken, email);
  if (response.status !== 201) {
    throw new Error(`Registering an Administrator answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  const { id } = z.object({ id: z.string() }).parse(response.body);
  const sub = googleSubject();
  const { accessToken } = await signInAsAdministrator(app, { sub, email });
  return { id, email, sub, accessToken };
}
