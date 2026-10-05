import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signInUser, TestUser } from './friends.js';
import { dropQuest, getQuest, joinQuest, ownQuest } from './quests.js';
import { SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

// An Open Quest led by the first User and joined by the others in order. The names sort against the order of entry.
async function joinedQuest(): Promise<{ questId: string; holders: [TestUser, TestUser, TestUser] }> {
  const holders = await Promise.all([
    signInUser(app, { name: '하나', department: '경영학과' }),
    signInUser(app, { name: '나나', department: '경영학과' }),
    signInUser(app, { name: '가나', department: '경영학과' }),
  ]);
  const questId = await ownQuest(app, holders[0], { joinPolicy: 'open' });
  await joinQuest(app, holders[1], questId);
  await joinQuest(app, holders[2], questId);
  return { questId, holders };
}

describe('The Holders of a Quest', () => {
  it('are in the order they entered', async () => {
    const { questId, holders } = await joinedQuest();

    const response = await getQuest(app, holders[2], questId);

    expect(response.body).toMatchObject({
      leader: { id: holders[0].id },
      holders: holders.map(({ id }) => ({ id })),
    });
  });
});

describe('The Leader dropping the Quest', () => {
  it('makes the Holder who entered earliest the Leader, and tells the Holders', async () => {
    const { questId, holders } = await joinedQuest();
    const [leader, second, third] = holders;

    await dropQuest(app, leader, questId);

    expect((await getQuest(app, third, questId)).body).toMatchObject({
      leader: { id: second.id },
      holders: [{ id: second.id }, { id: third.id }],
    });
    await vi.waitFor(() => {
      // Its joining, the third's joining and the drop.
      expect(watcher.for(second)).toHaveLength(3);
    });
  });
});

describe('Another Holder dropping the Quest', () => {
  it('leaves the Leader as it is', async () => {
    const { questId, holders } = await joinedQuest();
    const [leader, second, third] = holders;

    await dropQuest(app, second, questId);

    expect((await getQuest(app, third, questId)).body).toMatchObject({ leader: { id: leader.id } });
  });
});
