// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { getProfile } from './profile.js';
import { getMe, ONBOARDED_PROFILE, signIn, signInBeforeOnboarding, withAccessToken } from './sign-in.js';
import { TestUser } from './friends.js';

// A User as an Administrator's list serves them, exactly.
export const adminUserSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  department: z.string(),
  friendId: z.string(),
  onboarded: z.boolean(),
  friendCount: z.number(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

// A Friend of a User as an Administrator reads them, exactly.
export const adminFriendSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  department: z.string(),
  friendId: z.string(),
  since: z.iso.datetime(),
});

export function getAdminUsers(app: INestApplication<Server>, accessToken: string | undefined): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/admin/users'), accessToken);
}

// The list, of which only the Users with these email addresses are kept, in the list's order: the test files share the
// database.
export async function usersAmong(
  app: INestApplication<Server>,
  accessToken: string,
  emails: string[],
): Promise<AdminUser[]> {
  const response = await getAdminUsers(app, accessToken);
  if (response.status !== 200) {
    throw new Error(`GET /admin/users answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return z
    .array(adminUserSchema)
    .parse(response.body)
    .filter(({ email }) => emails.includes(email));
}

export function getAdminFriends(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  userId: string,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).get(`/admin/users/${userId}/friends`), accessToken);
}

export function postFriendship(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  userAId: string,
  userBId: string,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/admin/friendships'), accessToken).send({
    userAId,
    userBId,
  });
}

export function deleteFriendship(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  userAId: string,
  userBId: string,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).delete(`/admin/friendships/${userAId}/${userBId}`), accessToken);
}

// A new User with an email address of their own, onboarded with the profile given.
export async function signInWithEmail(
  app: INestApplication<Server>,
  profile: typeof ONBOARDED_PROFILE = ONBOARDED_PROFILE,
  email = `${randomUUID()}@snu.ac.kr`,
): Promise<TestUser & { email: string }> {
  const { accessToken } = await signIn(app, { email }, profile);
  const { id } = z.object({ id: z.string() }).parse((await getMe(app, accessToken)).body);
  const { friendId } = z.object({ friendId: z.string() }).parse((await getProfile(app, accessToken)).body);
  return { id, friendId, accessToken, email };
}

// A new User who has not completed onboarding, with an email address of their own.
export async function signInWithEmailBeforeOnboarding(app: INestApplication<Server>): Promise<string> {
  const email = `${randomUUID()}@snu.ac.kr`;
  await signInBeforeOnboarding(app, { email });
  return email;
}
