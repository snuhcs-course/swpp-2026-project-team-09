/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { fileURLToPath } from 'node:url';
import { inject } from 'vitest';
import { type UserDayService } from '../src/assistant/free-time/user-day.service.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import { googleSubject } from './google.js';
import { connectToDatabase } from './quests.js';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import {
  ADDED_QUEST,
  changedTutorialFile,
  completeAll,
  getTutorial,
  postTutorial,
  statuses,
  tutorialAfter,
  tutorialSchema,
} from './tutorial.js';
import { refuseKakao } from './walking-route.js';

const settings = inject('settings');

function startWithTutorial(file: string): Promise<INestApplication<Server>> {
  return startApp(settings, [], refuseKakao, refuseMatchServer, new ScriptedModel().model, [], undefined, file);
}

// The routes read only the access token.
function asUser(accessToken: string): TestUser {
  return { id: '', friendId: '', accessToken };
}

let app: INestApplication<Server>;
let prisma: PrismaClient;
let days: UserDayService;

beforeAll(async () => {
  app = await startApp(settings);
  // Imported after startApp and before the next start, so that it is the class this server registered.
  const { UserDayService: registered } = await import('../src/assistant/free-time/user-day.service.js');
  days = app.get(registered);
  prisma = connectToDatabase();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('A quest added to the content later', () => {
  let user: TestUser;
  let added: INestApplication<Server>;

  beforeAll(async () => {
    user = await signInUser(app);
    await tutorialAfter(postTutorial(app, user, 'enable'));
    await completeAll(app, user);
    added = await startWithTutorial(await changedTutorialFile({ extra: [ADDED_QUEST] }));
  });

  afterAll(async () => {
    await added.close();
  });

  it('leaves a finished User finished', async () => {
    const tutorial = await tutorialAfter(getTutorial(added, user));

    expect(tutorial.state).toBe('finished');
    expect(statuses(tutorial)['student-union']).toBe('notStarted');
  });

  it('shows as not started once the User turns the tutorial on again', async () => {
    const again = await tutorialAfter(postTutorial(added, user, 'enable'));

    expect(again.state).toBe('active');
    expect(again.quests.map(({ key, status }) => [key, status]).at(-1)).toEqual(['student-union', 'notStarted']);
    const finished = await tutorialAfter(postTutorial(added, user, 'quests/student-union/complete', { by: 'button' }));
    expect(finished.state).toBe('finished');
  });
});

describe('A quest removed from the content', () => {
  it('is left out, with its progress', async () => {
    const user = await signInUser(app);
    await tutorialAfter(postTutorial(app, user, 'enable'));
    await tutorialAfter(postTutorial(app, user, 'quests/art-museum/start'));
    const removed = await startWithTutorial(await changedTutorialFile({ without: ['art-museum'] }));
    try {
      const tutorial = await tutorialAfter(getTutorial(removed, user));

      expect(tutorial.state).toBe('available');
      expect(tutorial.quests.map(({ key }) => key)).not.toContain('art-museum');
      expect((await postTutorial(removed, user, 'quests/art-museum/start')).status).toBe(404);
    } finally {
      await removed.close();
    }
  });
});

describe('A bad tutorial file', () => {
  it('stops the server with the reason', async () => {
    const file = fileURLToPath(new URL('fixtures/tutorial/repeated-key.yaml', import.meta.url));

    await expect(startWithTutorial(file)).rejects.toThrow('Repeats the key s-card');
  });
});

describe('Tutorial progress', () => {
  it('makes no Quest, Sub Quest or Holder and leaves the User’s day as it was', async () => {
    const user = await signInUser(app);
    const today = new Date().toISOString().slice(0, 10);
    const before = await days.itemsOn(user.id, today);

    await tutorialAfter(postTutorial(app, user, 'quests/s-card/start'));
    await completeAll(app, user);

    expect(before).toEqual([]);
    expect(await days.itemsOn(user.id, today)).toEqual(before);
    expect(await prisma.questHolder.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.quest.count({ where: { leaderId: user.id } })).toBe(0);
  });

  it('follows the User to another sign-in, as on another phone', async () => {
    const sub = googleSubject();
    const first = await signIn(app, { sub });
    await tutorialAfter(postTutorial(app, asUser(first.accessToken), 'quests/kwanjeong/start'));

    const second = await signIn(app, { sub });

    expect(statuses(await tutorialAfter(getTutorial(app, asUser(second.accessToken))))['kwanjeong']).toBe('started');
  });

  it("carries no other User's progress and nothing of the User", async () => {
    const user = await signInUser(app, { name: '김비밀', department: '비밀학과' });
    const other = await signInUser(app);
    await tutorialAfter(postTutorial(app, other, 'quests/s-card/start'));

    const response = await getTutorial(app, user);
    const body = JSON.stringify(response.body);

    expect(statuses(tutorialSchema.parse(response.body))['s-card']).toBe('notStarted');
    for (const secret of [user.id, user.friendId, '김비밀', '비밀학과', other.id]) {
      expect(body).not.toContain(secret);
    }
  });
});
