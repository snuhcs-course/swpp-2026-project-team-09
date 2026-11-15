/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { type FriendViewService } from '../src/friends/friend-view.service.js';
import { befriend, friendLabel, getFriends, sendFriendRequest, signInUser, type TestUser } from './friends.js';
import { startApp } from './start-app.js';

// Each Friend's label, worked out over all of the viewer's Friends, as GET /friends and the Friend view give it.

const settings = inject('settings');
let app: INestApplication<Server>;
let view: FriendViewService;

beforeAll(async () => {
  app = await startApp(settings);
  // Imported after startApp, so that it is the class the server registered.
  const { FriendViewService } = await import('../src/friends/friend-view.service.js');
  view = app.get(FriendViewService);
});

afterAll(async () => {
  await app.close();
});

// For a test that signs in five Users, on a machine that may be busy.
const SLOW = { timeout: 30_000 };

const listedSchema = z.array(z.object({ id: z.string(), label: z.unknown() }));

// The labels by Friend, from GET /friends and then from the Friend view.
async function labelsOf(viewer: TestUser): Promise<Record<string, unknown>[]> {
  const listed = listedSchema.parse((await getFriends(app, viewer)).body);
  const viewed = await view.list(viewer.id);
  return [listed, viewed].map((friends) => Object.fromEntries(friends.map(({ id, label }) => [id, label])));
}

describe('The label of each Friend', () => {
  it(
    'follows the Friends there are on the next fetch, the same in GET /friends and the Friend view',
    SLOW,
    async () => {
      const [viewer, kim, lee, otherKim, waiting] = await Promise.all([
        signInUser(app, { name: '김민수', department: '경영학과' }),
        signInUser(app, { name: '김민수', department: '컴퓨터공학부' }),
        signInUser(app, { name: '이민수', department: '경영학과' }),
        signInUser(app, { name: '김민수', department: '경영학과' }),
        signInUser(app, { name: '박민수', department: '경영학과' }),
      ]);
      await befriend(app, viewer, kim);
      await sendFriendRequest(app, waiting, viewer.friendId);

      const alone = { [kim.id]: friendLabel('민수') };
      expect(await labelsOf(viewer)).toEqual([alone, alone]);

      await befriend(app, viewer, lee);

      const twoMinsu = { [kim.id]: friendLabel('김민수'), [lee.id]: friendLabel('이민수') };
      expect(await labelsOf(viewer)).toEqual([twoMinsu, twoMinsu]);

      await befriend(app, viewer, otherKim);

      const twoKim = {
        [kim.id]: friendLabel('김민수', '컴퓨터공학부'),
        [lee.id]: friendLabel('이민수'),
        [otherKim.id]: friendLabel('김민수', '경영학과'),
      };
      expect(await labelsOf(viewer)).toEqual([twoKim, twoKim]);
    },
  );
});
