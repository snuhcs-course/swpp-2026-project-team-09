import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { signIn, type Tokens, withAccessToken } from './sign-in.js';

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

export function postOnboarding(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  body: object,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/users/me/onboarding'), accessToken).send(body);
}

export const ONBOARDED_PROFILE = { name: '홍길동', department: '컴퓨터공학부' };

// Signs in as a new User and completes onboarding with the profile given.
export async function signInOnboarded(
  app: INestApplication<Server>,
  profile: typeof ONBOARDED_PROFILE = ONBOARDED_PROFILE,
): Promise<Tokens> {
  const tokens = await signIn(app);
  const response = await postOnboarding(app, tokens.accessToken, profile);
  if (response.status !== 204) {
    throw new Error(`Onboarding answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return tokens;
}
