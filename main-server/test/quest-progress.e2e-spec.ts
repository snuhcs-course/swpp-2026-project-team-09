import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser } from './friends.js';
import { connectToDatabase, getQuest, getQuests, markDone, questFor, storeEvent, subQuestIn } from './quests.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const HOUR = 60 * 60 * 1000;

// Moves the time by which Sub Quests end.
function setClock(at: Date): void {
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(at);
}

describe('A Sub Quest with an end time', () => {
  it('is ended once the end time has passed, and not before', async () => {
    const user = await signInUser(app);
    const { questId } = await questFor(app, user, (await storeEvent(prisma, { endsAt: null })).id);
    const endsAt = new Date(Date.now() + 3 * HOUR);
    await subQuestIn(app, user, questId, { title: '카페', endsAt: endsAt.toISOString() });

    setClock(new Date(endsAt.getTime() - 1));
    const before = await getQuest(app, user, questId);
    setClock(endsAt);
    const after = await getQuest(app, user, questId);

    expect(before.body).toMatchObject({
      subQuests: [
        { completion: 'by_hand', ended: false },
        { completion: 'by_time', ended: false },
      ],
    });
    expect(after.body).toMatchObject({
      subQuests: [
        { ended: false, done: false },
        { ended: true, done: false },
      ],
    });
  });
});

describe('Marking a Sub Quest as done', () => {
  it('ends it for the User', async () => {
    const user = await signInUser(app);
    const { questId, attendingId } = await questFor(app, user, (await storeEvent(prisma, { endsAt: null })).id);

    const response = await markDone(app, user, { questId, subQuestId: attendingId });

    expect(response.status).toBe(204);
    expect((await getQuest(app, user, questId)).body).toMatchObject({
      subQuests: [{ completion: 'by_hand', done: true, ended: true }],
    });
  });

  it('changes nothing when it is done already', async () => {
    const user = await signInUser(app);
    const { questId } = await questFor(app, user, (await storeEvent(prisma)).id);
    const subQuestId = await subQuestIn(app, user, questId);
    await markDone(app, user, { questId, subQuestId });

    const again = await markDone(app, user, { questId, subQuestId });

    expect(again.status).toBe(204);
    expect((await getQuest(app, user, questId)).body).toMatchObject({ subQuests: [{ done: false }, { done: true }] });
  });

  it('leaves the other Holders as they were', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const { questId, attendingId } = await questFor(app, user, event.id);
    // A second Holder, as a match or a Party gives.
    await prisma.questHolder.create({ data: { questId, userId: other.id, globalEventId: event.id } });

    await markDone(app, user, { questId, subQuestId: attendingId });

    expect((await getQuest(app, user, questId)).body).toMatchObject({ subQuests: [{ done: true, ended: true }] });
    expect((await getQuest(app, other, questId)).body).toMatchObject({ subQuests: [{ done: false, ended: false }] });
  });

  it('is refused for a Sub Quest the Quest does not have, and to a User who is not a Holder', async () => {
    const [user, stranger] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId, attendingId } = await questFor(app, user, (await storeEvent(prisma)).id);

    const unknown = await markDone(app, user, { questId, subQuestId: randomUUID() });
    const notHeld = await markDone(app, stranger, { questId, subQuestId: attendingId });

    expect(unknown.body).toMatchObject(refused(404, 'SUB_QUEST_NOT_FOUND'));
    expect(notHeld.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });
});

describe('The Quest list', () => {
  it('leaves out a Quest whose Sub Quests have all ended for the User, which can still be read', async () => {
    const user = await signInUser(app);
    const ahead = await questFor(app, user, (await storeEvent(prisma)).id);
    const event = await storeEvent(prisma, { endsAt: null });
    const { questId, attendingId } = await questFor(app, user, event.id);
    const subQuestId = await subQuestIn(app, user, questId, { title: '카페' });
    await markDone(app, user, { questId, subQuestId: attendingId });

    const partly = await getQuests(app, user);
    await markDone(app, user, { questId, subQuestId });
    const ended = await getQuests(app, user);

    expect(partly.body).toMatchObject([{ id: ahead.questId }, { id: questId }]);
    expect(ended.body).toMatchObject([{ id: ahead.questId }]);
    expect((await getQuest(app, user, questId)).status).toBe(200);
  });

  it('leaves out a Quest once the end times of its Sub Quests have passed', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, user, event.id);

    setClock(event.endsAt ?? new Date());

    expect((await getQuests(app, user)).body).toEqual([]);
    expect((await getQuest(app, user, questId)).body).toMatchObject({ subQuests: [{ ended: true }] });
  });

  it('is empty for a User who holds no Quest', async () => {
    const user = await signInUser(app);

    expect((await getQuests(app, user)).body).toEqual([]);
  });
});
