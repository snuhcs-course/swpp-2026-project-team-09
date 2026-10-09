/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { befriend, signInUser, TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';

// 중앙도서관 본관, inside the Campus Boundary, and 교수아파트1, in the wedge that the outline leaves out in the
// north-east, as the campus map places them.
export const ON_CAMPUS = { latitude: 37.4594, longitude: 126.95199 };
export const OFF_CAMPUS = { latitude: 37.46709, longitude: 126.95717 };

type SignedIn = Pick<TestUser, 'accessToken'>;

export function setMasterSwitch(app: INestApplication<Server>, user: SignedIn, on: boolean): request.Test {
  return withAccessToken(request(app.getHttpServer()).put('/users/me/master-switch'), user.accessToken).send({ on });
}

export function setFriendSharing(
  app: INestApplication<Server>,
  user: SignedIn,
  friendUserId: string,
  on: boolean,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).put(`/friends/${friendUserId}/sharing`), user.accessToken).send({
    on,
  });
}

// A position measured now with an accuracy of 10 m, on campus unless changes say otherwise.
export function uploadPosition(app: INestApplication<Server>, user: SignedIn, changes: object = {}): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/positions'), user.accessToken).send({
    ...ON_CAMPUS,
    accuracy: 10,
    measuredAt: new Date().toISOString(),
    ...changes,
  });
}

export function getPositions(app: INestApplication<Server>, user: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/positions'), user.accessToken);
}

// Throws unless the call answered the status given, so that a test's setup fails where it went wrong.
export async function expectStatus(call: request.Test, status: number): Promise<request.Response> {
  const response = await call;
  if (response.status !== status) {
    throw new Error(`Expected ${status}, got ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return response;
}

// Two new Users who are Friends and have turned their Master Switches on.
export async function sharingFriends(app: INestApplication<Server>): Promise<[TestUser, TestUser]> {
  const [user, friend] = await Promise.all([signInUser(app), signInUser(app)]);
  await befriend(app, user, friend);
  await Promise.all([
    expectStatus(setMasterSwitch(app, user, true), 204),
    expectStatus(setMasterSwitch(app, friend, true), 204),
  ]);
  return [user, friend];
}
