import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { A_FRIEND_ID, befriend } from './friends.js';
import {
  adminFriendSchema,
  getAdminFriends,
  signInWithEmail,
  signInWithEmailBeforeOnboarding,
  usersAmong,
} from './admin-users.js';
import { ANY_STRING, refused } from './signals.js';
import { signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';
import { z } from 'zod';

let app: INestApplication<Server>;
let accessToken: string;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  ({ accessToken } = await signInAsAdministrator(app));
});

afterAll(async () => {
  await app.close();
});

describe("An Administrator's list of Users", () => {
  it('has each User with their profile, Friend ID and number of Friends', async () => {
    const user = await signInWithEmail(app, { name: '김철수', department: '경영학과' });
    const [first, second] = await Promise.all([signInWithEmail(app), signInWithEmail(app)]);
    await befriend(app, user, first);
    await befriend(app, second, user);

    expect(await usersAmong(app, accessToken, [user.email])).toEqual([
      {
        id: user.id,
        name: '김철수',
        email: user.email,
        department: '경영학과',
        friendId: user.friendId,
        onboarded: true,
        friendCount: 2,
      },
    ]);
  });

  it('has a User before onboarding, with an empty name and department', async () => {
    const email = await signInWithEmailBeforeOnboarding(app);

    expect(await usersAmong(app, accessToken, [email])).toEqual([
      { id: ANY_STRING, name: '', email, department: '', friendId: A_FRIEND_ID, onboarded: false, friendCount: 0 },
    ]);
  });

  it('is ordered by name in the Korean order, then by email, with Users before onboarding last', async () => {
    const names = ['Bob', '하늘', 'alice', '가람'];
    const users = await Promise.all(names.map((name) => signInWithEmail(app, { name, department: '경영학과' })));
    const [later, earlier] = [`z-${randomUUID()}@snu.ac.kr`, `a-${randomUUID()}@snu.ac.kr`];
    await Promise.all(
      [later, earlier].map((email) => signInWithEmail(app, { name: '가람', department: '경영학과' }, email)),
    );
    const notOnboarded = await signInWithEmailBeforeOnboarding(app);
    const emails = [notOnboarded, later, earlier, ...users.map(({ email }) => email)];

    const listed = await usersAmong(app, accessToken, emails);

    expect(listed.map(({ name, email }) => [name, email])).toEqual([
      ...[earlier, later, users[3]?.email].toSorted().map((email) => ['가람', email]),
      ['하늘', users[1]?.email],
      ['alice', users[2]?.email],
      ['Bob', users[0]?.email],
      ['', notOnboarded],
    ]);
  });
});

describe("An Administrator's list of a User's Friends", () => {
  it('has each Friend in the order of the names, with when the friendship started', async () => {
    const user = await signInWithEmail(app);
    const later = await signInWithEmail(app, { name: '하늘', department: '수학과' });
    const earlier = await signInWithEmail(app, { name: '가람', department: '경영학과' });
    const before = new Date();
    await befriend(app, user, later);
    await befriend(app, earlier, user);

    const response = await getAdminFriends(app, accessToken, user.id);

    expect(response.status).toBe(200);
    const friends = z.array(adminFriendSchema).parse(response.body);
    expect(friends).toEqual([
      {
        id: earlier.id,
        name: '가람',
        email: earlier.email,
        department: '경영학과',
        friendId: earlier.friendId,
        since: ANY_STRING,
      },
      {
        id: later.id,
        name: '하늘',
        email: later.email,
        department: '수학과',
        friendId: later.friendId,
        since: ANY_STRING,
      },
    ]);
    for (const { since } of friends) {
      expect(new Date(since).getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    }
  });
});

describe("An Administrator's list of a User's Friends, when there are none or no User", () => {
  it('is empty for a User without Friends', async () => {
    const user = await signInWithEmail(app);

    expect((await getAdminFriends(app, accessToken, user.id)).body).toEqual([]);
  });

  it('is refused with 404 for an unknown User', async () => {
    const response = await getAdminFriends(app, accessToken, randomUUID());

    expect(response.body).toMatchObject(refused(404, 'USER_NOT_FOUND'));
  });

  it('is refused with 400 for an id that is not a UUID', async () => {
    expect((await getAdminFriends(app, accessToken, 'not-a-uuid')).status).toBe(400);
  });
});
