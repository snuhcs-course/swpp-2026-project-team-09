import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { connect } from './containers.js';
import { FRIEND_ID, lookUpFriendId, signInUser } from './friends.js';
import { googleSubject } from './google.js';
import { getProfile, patchProfile } from './profile.js';
import { signIn } from './sign-in.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
const prisma = connect(settings.DATABASE_URL);
const friendIdOf = (profile: unknown): { friendId: string } => z.object({ friendId: z.string() }).parse(profile);

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe('A Friend ID', () => {
  it('is given to every User, and the profile and the lobby show it', async () => {
    const { accessToken } = await signIn(app);

    const { friendId } = friendIdOf((await getProfile(app, accessToken)).body);
    const lobby = await request(app.getHttpServer()).post('/lobby').auth(accessToken, { type: 'bearer' });

    expect(friendId).toMatch(FRIEND_ID);
    expect(lobby.body).toMatchObject({ profile: { friendId } });
  });

  it('differs from User to User', async () => {
    const users = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);

    expect(new Set(users.map(({ friendId }) => friendId)).size).toBe(3);
  });

  it('never changes, through a later sign-in or an edit of the profile', async () => {
    const sub = googleSubject();
    const { accessToken } = await signIn(app, { sub });
    const { friendId } = friendIdOf((await getProfile(app, accessToken)).body);

    await patchProfile(app, accessToken, { name: '길동', friendId: 'ABCDEFGH' });
    const again = await signIn(app, { sub });

    expect((await getProfile(app, again.accessToken)).body).toMatchObject({ name: '길동', friendId });
  });

  it('is kept unique by the database', async () => {
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);

    await expect(
      prisma.user.update({ where: { id: second.id }, data: { friendId: first.friendId } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});

describe('Looking up a Friend ID', () => {
  it("answers with its owner's name and department", async () => {
    const owner = await signInUser(app, { name: '김철수', department: '경영학과' });
    const asking = await signInUser(app);

    const response = await lookUpFriendId(app, asking.accessToken, owner.friendId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ name: '김철수', department: '경영학과' });
  });

  it('reads a Friend ID typed in small letters', async () => {
    const owner = await signInUser(app, { name: '김철수', department: '경영학과' });
    const asking = await signInUser(app);

    const response = await lookUpFriendId(app, asking.accessToken, owner.friendId.toLowerCase());

    expect(response.body).toEqual({ name: '김철수', department: '경영학과' });
  });

  it('says so when nobody holds it', async () => {
    const asking = await signInUser(app);

    const response = await lookUpFriendId(app, asking.accessToken, 'AAAAAAAA');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'FRIEND_ID_NOT_FOUND'));
  });
});
