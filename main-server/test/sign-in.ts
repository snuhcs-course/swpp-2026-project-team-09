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

// The profile the app's onboarding sends with a new account's first sign-in.
export const NEW_PROFILE = { name: '홍길동', department: '컴퓨터공학부' };

// `profile: null` signs in as the app does before onboarding.
export function postSignIn(
  app: INestApplication<Server>,
  claims: Partial<TokenPayload> = {},
  profile: object | null = NEW_PROFILE,
): request.Test {
  const idToken = googleIdToken(claims);
  return request(app.getHttpServer())
    .post('/auth/google')
    .send(profile === null ? { idToken } : { idToken, profile });
}

// Signs in as the app does, with a Google ID token for a new SNU account unless claims change it. A new account signs
// up with the profile given.
export async function signIn(
  app: INestApplication<Server>,
  claims: Partial<TokenPayload> = {},
  profile: typeof NEW_PROFILE = NEW_PROFILE,
): Promise<Tokens> {
  const response = await postSignIn(app, claims, profile);
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

// Moves the use of a refresh token back past the 60 seconds in which it can be exchanged again.
export async function useLongAgo(prisma: PrismaClient, refreshToken: string): Promise<void> {
  await prisma.refreshToken.update({
    where: { tokenHash: refreshTokenHash(refreshToken) },
    data: { revokedAt: new Date(Date.now() - 61_000) },
  });
}

export function postSignOut(app: INestApplication<Server>, accessToken?: string): request.Test {
  const post = request(app.getHttpServer()).post('/auth/sign-out');
  return accessToken === undefined ? post : post.auth(accessToken, { type: 'bearer' });
}

export function sessionOf(accessToken: string): string {
  return z.object({ sid: z.string() }).parse(new JwtService().decode(accessToken)).sid;
}

// GET /users/me stands for every route that needs an access token.
export function getMe(app: INestApplication<Server>, accessToken?: string): request.Test {
  const get = request(app.getHttpServer()).get('/users/me');
  return accessToken === undefined ? get : get.auth(accessToken, { type: 'bearer' });
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
