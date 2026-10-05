import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { signInUser, TestUser } from './friends.js';
import { changeQuest, handOver, removeHolder } from './quest-recruiting.js';
import { dropQuest, getQuest, getQuests, joinQuest, markDone, ownQuest } from './quests.js';
import { refused, SignalWatcher } from './signals.js';
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

describe('The Leader handing the role over', () => {
  it('makes another Holder the Leader, and tells every Holder', async () => {
    const { questId, holders } = await joinedQuest();
    const [leader, second, third] = holders;

    const response = await handOver(app, leader, questId, third.id);

    expect(response.status).toBe(204);
    expect((await getQuest(app, second, questId)).body).toMatchObject({ leader: { id: third.id } });
    expect((await changeQuest(app, third, questId, { capacity: 5 })).status).toBe(200);
    expect((await changeQuest(app, leader, questId, { capacity: 6 })).body).toMatchObject(
      refused(403, 'NOT_QUEST_LEADER'),
    );
    await vi.waitFor(() => {
      // Its joining, the third's joining, the handing over and the change.
      expect(watcher.for(second)).toHaveLength(4);
    });
  });

  it('is refused for a User who does not hold the Quest', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader);

    const response = await handOver(app, leader, questId, user.id);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'NOT_QUEST_HOLDER'));
  });
});

describe('The Leader removing a Holder', () => {
  it('takes the Holder out, and tells every Holder, the one removed included', async () => {
    const { questId, holders } = await joinedQuest();
    const [leader, second, third] = holders;

    const response = await removeHolder(app, leader, questId, second.id);

    expect(response.status).toBe(204);
    expect((await getQuests(app, second)).body).toEqual([]);
    expect((await getQuest(app, third, questId)).body).toMatchObject({
      leader: { id: leader.id },
      holders: [{ id: leader.id }, { id: third.id }],
    });
    await vi.waitFor(() => {
      // Its joining, the third's joining and the removal.
      expect(watcher.for(second)).toHaveLength(3);
      expect(watcher.for(third)).toHaveLength(2);
    });
  });

  it('takes the Holder’s progress, and lets the User join again', async () => {
    const { questId, holders } = await joinedQuest();
    const [leader, second] = holders;
    const { subQuests } = z
      .object({ subQuests: z.array(z.object({ id: z.string() })) })
      .parse((await getQuest(app, second, questId)).body);
    await markDone(app, second, { questId, subQuestId: subQuests[0]?.id ?? '' });

    await removeHolder(app, leader, questId, second.id);

    expect((await joinQuest(app, second, questId)).status).toBe(201);
    expect((await getQuest(app, second, questId)).body).toMatchObject({ subQuests: [{ done: false }] });
  });

  it('is refused for a User who does not hold the Quest', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader);

    const response = await removeHolder(app, leader, questId, user.id);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'NOT_QUEST_HOLDER'));
  });
});

describe('The Leader’s controls', () => {
  it('are each refused for another Holder', async () => {
    const { questId, holders } = await joinedQuest();
    const [leader, second, third] = holders;

    const responses = await Promise.all([
      changeQuest(app, second, questId, { title: '내 퀘스트' }),
      handOver(app, second, questId, third.id),
      removeHolder(app, second, questId, third.id),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject(refused(403, 'NOT_QUEST_LEADER'));
    }
    expect((await getQuest(app, third, questId)).body).toMatchObject({
      title: '저녁 같이 먹어요',
      leader: { id: leader.id },
      holders: holders.map(({ id }) => ({ id })),
    });
  });
});
