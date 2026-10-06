import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { GlobalEvent, PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import { changeState, patchGlobalEvent } from './global-event-changes.js';
import { signInAsAdministrator } from './sign-in.js';
import { connectToDatabase, getQuests, questFor, storeEvent, storeSharedQuest, subQuestIn } from './quests.js';
import { SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
let watcher: SignalWatcher;
let accessToken: string;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
  prisma = connectToDatabase();
  ({ accessToken } = await signInAsAdministrator(app));
});

afterAll(async () => {
  await prisma.$disconnect();
  await watcher.stop();
  await app.close();
});

const attendingSchema = z.object({
  id: z.string(),
  subQuests: z.array(z.object({ attending: z.boolean() }).loose()),
});

// The attending Sub Quest of the User's Quest, as `GET /quests` lists it.
async function attendingIn(user: TestUser, questId: string): Promise<object | undefined> {
  const quests = z.array(attendingSchema).parse((await getQuests(app, user)).body);
  return quests.find(({ id }) => id === questId)?.subQuests.find(({ attending }) => attending);
}

// Two Users each with a Quest of their own for the event, and two with a Shared Quest for it.
async function holdersOf(event: GlobalEvent): Promise<{ holders: TestUser[]; questId: string; user: TestUser }> {
  const holders = await Promise.all([1, 2, 3, 4].map(() => signInUser(app)));
  const [user, other, leader, member] = holders;
  const { questId } = await questFor(app, user, event.id);
  // A Sub Quest ahead, so that the Quest stays in the list once the event is cancelled.
  await subQuestIn(app, user, questId);
  await questFor(app, other, event.id);
  await storeSharedQuest(prisma, event, [leader.id, member.id]);
  return { holders, questId, user };
}

function questsChangedTo(user: TestUser): number {
  return watcher.for(user).filter(({ name }) => name === 'quests-changed').length;
}

describe("An edit of a published event's", () => {
  it('title, time and place shows on the attending Sub Quest, and quests-changed goes to every Holder', async () => {
    const event = await storeEvent(prisma);
    const { holders, questId, user } = await holdersOf(event);
    const before = holders.map((holder) => questsChangedTo(holder));

    await patchGlobalEvent(app, accessToken, event.id, {
      version: 1,
      title: '설명회 (장소 변경)',
      startsAt: '2099-10-20T17:00:00+09:00',
      endsAt: '2099-10-20T19:00:00+09:00',
      place: '제2공학관 101호',
      latitude: 37.44887,
      longitude: 126.95265,
    }).expect(200);

    expect(await attendingIn(user, questId)).toMatchObject({
      title: '설명회 (장소 변경)',
      startsAt: '2099-10-20T08:00:00.000Z',
      endsAt: '2099-10-20T10:00:00.000Z',
      place: { placeId: null, label: '제2공학관 101호', latitude: 37.44887, longitude: 126.95265 },
      cancelled: false,
    });
    await vi.waitFor(() => {
      expect(holders.map((holder) => questsChangedTo(holder))).toEqual(before.map((count) => count + 1));
    });
  });
});

describe('Cancelling a published event', () => {
  it('shows the attending Sub Quest cancelled, and quests-changed goes to every Holder', async () => {
    const event = await storeEvent(prisma);
    const { holders, questId, user } = await holdersOf(event);
    const before = holders.map((holder) => questsChangedTo(holder));

    await changeState(app, accessToken, event.id, 'cancel', 1).expect(200);

    expect(await attendingIn(user, questId)).toMatchObject({ cancelled: true, ended: true });
    await vi.waitFor(() => {
      expect(holders.map((holder) => questsChangedTo(holder))).toEqual(before.map((count) => count + 1));
    });
  });
});
