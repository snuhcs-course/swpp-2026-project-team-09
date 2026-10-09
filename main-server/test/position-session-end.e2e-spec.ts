// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #42
import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { googleSubject } from './google.js';
import { expectStatus, getPositions, setMasterSwitch, uploadPosition } from './location-sharing.js';
import { getProfile } from './profile.js';
import { getMe, postRefreshToken, postSignOut, refresh, signIn, useLongAgo } from './sign-in.js';
import { SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
let watcher: SignalWatcher;
let prisma: PrismaClient;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(settings), SignalWatcher.start()]);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: settings.DATABASE_URL }) });
});

afterAll(async () => {
  await Promise.all([watcher.stop(), prisma.$disconnect()]);
  await app.close();
});

interface Subject extends TestUser {
  sub: string;
  refreshToken: string;
}

// A User whose position a Friend sees, signed in with a Google account that the test signs in with again.
async function seenSubject(): Promise<[Subject, TestUser]> {
  const sub = googleSubject();
  const { accessToken, refreshToken } = await signIn(app, { sub });
  const { id } = z.object({ id: z.string() }).parse((await getMe(app, accessToken)).body);
  const { friendId } = z.object({ friendId: z.string() }).parse((await getProfile(app, accessToken)).body);
  const subject = { id, friendId, accessToken, refreshToken, sub };
  const viewer = await signInUser(app);
  await befriend(app, viewer, subject);
  await expectStatus(setMasterSwitch(app, subject, true), 204);
  await expectStatus(setMasterSwitch(app, viewer, true), 204);
  await expectStatus(uploadPosition(app, subject), 200);
  return [subject, viewer];
}

// The position is cleared, and the viewer is told. The answer to the request that ended the session does not wait for
// either.
async function expectPositionGone(subject: Subject, viewer: TestUser): Promise<void> {
  await vi.waitFor(async () => {
    expect((await getPositions(app, viewer)).body).toEqual([]);
  });
  await vi.waitFor(() => {
    expect(watcher.for(viewer).filter(({ name }) => name === 'position-removed')).toEqual([
      { userIds: [viewer.id], name: 'position-removed', payload: { userId: subject.id } },
    ]);
  });
}

describe("The end of the subject's session", () => {
  it('by a sign-out clears the position', async () => {
    const [subject, viewer] = await seenSubject();

    expect((await postSignOut(app, subject.accessToken)).status).toBe(204);

    await expectPositionGone(subject, viewer);
  });

  it('by a sign-in on another phone clears the position', async () => {
    const [subject, viewer] = await seenSubject();

    await signIn(app, { sub: subject.sub });

    await expectPositionGone(subject, viewer);
  });

  it('by a used refresh token that comes back clears the position', async () => {
    const [subject, viewer] = await seenSubject();
    await refresh(app, subject.refreshToken);
    await useLongAgo(prisma, subject.refreshToken);

    expect((await postRefreshToken(app, subject.refreshToken)).status).toBe(401);

    await expectPositionGone(subject, viewer);
  });

  it('leaves the position of a refresh that keeps the session', async () => {
    const [subject, viewer] = await seenSubject();

    await refresh(app, subject.refreshToken);

    expect((await getPositions(app, viewer)).body).toEqual([expect.objectContaining({ userId: subject.id })]);
  });
});
