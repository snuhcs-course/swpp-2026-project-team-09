import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from 'google-auth-library';
import { createHash, randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { administratorIdToken, googleIdToken, googleSubject } from './google.js';

// The answer to a sign-in and to a refresh, exactly. Parsing a response body with it checks the body.
export const tokensSchema = z.strictObject({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export type Tokens = z.infer<typeof tokensSchema>;

// The answer to a sign-in, exactly.
export const signInResultSchema = tokensSchema.extend({
  onboarding: z.strictObject({
    completed: z.boolean(),
    suggestion: z.strictObject({ name: z.string().nullable(), department: z.string().nullable() }).optional(),
  }),
});

export type SignInResult = z.infer<typeof signInResultSchema>;

export function postSignIn(app: INestApplication<Server>, claims: Partial<TokenPayload> = {}): request.Test {
  return request(app.getHttpServer())
    .post('/auth/google')
    .send({ idToken: googleIdToken(claims) });
}

// Signs in as the app does, with a Google ID token for a new SNU account unless claims change it, and stops before
// onboarding.
export async function signInBeforeOnboarding(
  app: INestApplication<Server>,
  claims: Partial<TokenPayload> = {},
): Promise<SignInResult> {
  const response = await postSignIn(app, claims);
  if (response.status !== 200) {
    throw new Error(`Sign-in answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return signInResultSchema.parse(response.body);
}

export function postOnboarding(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  body: object,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/users/me/onboarding'), accessToken).send(body);
}

export const ONBOARDED_PROFILE = { name: '홍길동', department: '컴퓨터공학부' };

// Signs in, and completes onboarding with the profile given if the User has not yet, so that every User route lets
// the User in.
export async function signIn(
  app: INestApplication<Server>,
  claims: Partial<TokenPayload> = {},
  profile: typeof ONBOARDED_PROFILE = ONBOARDED_PROFILE,
): Promise<Tokens> {
  const { accessToken, refreshToken, onboarding } = await signInBeforeOnboarding(app, claims);
  if (!onboarding.completed) {
    const response = await postOnboarding(app, accessToken, profile);
    if (response.status !== 204) {
      throw new Error(`Onboarding answered ${response.status}: ${JSON.stringify(response.body)}`);
    }
  }
  return { accessToken, refreshToken };
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

// Moves the use of a refresh token back past the 60 seconds in which it can be exchanged again.
export async function useLongAgo(prisma: PrismaClient, refreshToken: string): Promise<void> {
  await prisma.refreshToken.update({
    where: { tokenHash: refreshTokenHash(refreshToken) },
    data: { revokedAt: new Date(Date.now() - 61_000) },
  });
}

// Sends the access token as the app does, or no token at all.
export function withAccessToken(call: request.Test, accessToken: string | undefined): request.Test {
  return accessToken === undefined ? call : call.auth(accessToken, { type: 'bearer' });
}

export function postSignOut(app: INestApplication<Server>, accessToken?: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/auth/sign-out'), accessToken);
}

export function sessionOf(accessToken: string): string {
  return z.object({ sid: z.string() }).parse(new JwtService().decode(accessToken)).sid;
}

// GET /users/me stands for every route that needs an access token.
export function getMe(app: INestApplication<Server>, accessToken?: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/users/me'), accessToken);
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
