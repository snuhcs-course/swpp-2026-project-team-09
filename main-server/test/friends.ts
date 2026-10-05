import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { getProfile } from './profile.js';
import { getMe, ONBOARDED_PROFILE, signIn, withAccessToken } from './sign-in.js';

// 8 characters from capital letters and digits, without 0, O, 1, I and L.
export const FRIEND_ID = /^[2-9A-HJKMNP-Z]{8}$/u;

// Matches any Friend ID in an expected value. Typed, so that lint lets it into an object.
export const A_FRIEND_ID: unknown = expect.stringMatching(FRIEND_ID);

export interface TestUser {
  id: string;
  friendId: string;
  accessToken: string;
}

// Signs in a new User with the profile given and reads what the tests name them by.
export async function signInUser(
  app: INestApplication<Server>,
  profile: typeof ONBOARDED_PROFILE = ONBOARDED_PROFILE,
): Promise<TestUser> {
  const { accessToken } = await signIn(app, {}, profile);
  const { id } = z.object({ id: z.string() }).parse((await getMe(app, accessToken)).body);
  const { friendId } = z.object({ friendId: z.string() }).parse((await getProfile(app, accessToken)).body);
  return { id, friendId, accessToken };
}

export function lookUpFriendId(app: INestApplication<Server>, accessToken: string, friendId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).get(`/friend-ids/${friendId}`), accessToken);
}

export function sendFriendRequest(app: INestApplication<Server>, from: TestUser, friendId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/friend-requests'), from.accessToken).send({ friendId });
}

export function getFriendRequests(app: INestApplication<Server>, user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/friend-requests'), user.accessToken);
}

export function answerFriendRequest(
  app: INestApplication<Server>,
  user: TestUser,
  requestId: string,
  answer: 'accept' | 'decline' | 'cancel',
): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).post(`/friend-requests/${requestId}/${answer}`),
    user.accessToken,
  );
}

export function getFriends(app: INestApplication<Server>, user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/friends'), user.accessToken);
}

// Names the Friend by their User id, as the list of Friends gives it.
export function endFriendship(app: INestApplication<Server>, user: TestUser, friendUserId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).delete(`/friends/${friendUserId}`), user.accessToken);
}

const requestListsSchema = z.object({
  received: z.array(z.object({ id: z.string() })),
  sent: z.array(z.object({ id: z.string() })),
});

// The id of the one Friend Request that `receiver` has received.
async function receivedRequestId(app: INestApplication<Server>, receiver: TestUser): Promise<string> {
  const { received } = requestListsSchema.parse((await getFriendRequests(app, receiver)).body);
  const [only] = received;
  if (only === undefined || received.length !== 1) {
    throw new Error(`Expected one received Friend Request, found ${received.length}`);
  }
  return only.id;
}

// Sends a Friend Request from one User to the other and answers its id.
export async function requestFriendship(
  app: INestApplication<Server>,
  sender: TestUser,
  receiver: TestUser,
): Promise<string> {
  const response = await sendFriendRequest(app, sender, receiver.friendId);
  if (response.status !== 201) {
    throw new Error(`Sending a Friend Request answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return receivedRequestId(app, receiver);
}

// Makes two Users Friends, as a Friend Request and its acceptance do.
export async function befriend(app: INestApplication<Server>, sender: TestUser, receiver: TestUser): Promise<void> {
  const requestId = await requestFriendship(app, sender, receiver);
  const response = await answerFriendRequest(app, receiver, requestId, 'accept');
  if (response.status !== 204) {
    throw new Error(`Accepting a Friend Request answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
}
