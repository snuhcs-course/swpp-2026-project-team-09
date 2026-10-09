// AI-generated with Claude Opus 5.5, 2026-10-06 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by TaeHyun79 and fyoon46 in #41 #74
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import {
  addSubQuest,
  cancelSubQuest,
  connectToDatabase,
  editSubQuest,
  getQuest,
  ownQuest,
  questFor,
  storeEvent,
  subQuestIn,
} from './quests.js';
import { ANY_STRING, refused } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// 제1공학관, 301동, on the campus map.
const engineering1 = { latitude: 37.45016, longitude: 126.95259 };

async function engineering1Id(): Promise<string> {
  return (await prisma.place.findFirstOrThrow({ where: { number: '301', origin: 'campus_map' } })).id;
}

const cafe = {
  title: '카페',
  startsAt: '2026-10-13T19:00:00.000Z',
  endsAt: '2026-10-13T20:00:00.000Z',
  place: { latitude: 37.4601, longitude: 126.9512, label: '자하연 앞 카페' },
};

async function attendingUser(): Promise<{ user: TestUser; questId: string; attendingId: string }> {
  const user = await signInUser(app);
  const event = await storeEvent(prisma);
  return { user, ...(await questFor(app, user, event.id)) };
}

describe('Adding a Sub Quest', () => {
  it('adds it after the attending one, with a point on the map', async () => {
    const { user, questId } = await attendingUser();

    const response = await addSubQuest(app, user, questId, cafe);

    const added = {
      id: ANY_STRING,
      attending: false,
      title: '카페',
      startsAt: cafe.startsAt,
      endsAt: cafe.endsAt,
      place: { placeId: null, label: '자하연 앞 카페', latitude: 37.4601, longitude: 126.9512 },
      completion: 'by_time',
      cancelled: false,
      done: false,
      ended: false,
    };
    expect(response.status).toBe(201);
    expect(response.body).toEqual(added);
    expect((await getQuest(app, user, questId)).body).toMatchObject({ subQuests: [{ attending: true }, added] });
  });

  it('takes a Place from the list, and needs only a title', async () => {
    const { user, questId } = await attendingUser();
    const placeId = await engineering1Id();

    const withPlace = await addSubQuest(app, user, questId, { title: '스터디', place: { placeId } });
    const titleOnly = await addSubQuest(app, user, questId, { title: '저녁' });

    expect(withPlace.body).toMatchObject({
      startsAt: null,
      endsAt: null,
      place: { placeId, label: '제1공학관', ...engineering1 },
      completion: 'by_hand',
    });
    expect(titleOnly.body).toMatchObject({ title: '저녁', place: null, completion: 'by_hand' });
  });

  it('keeps words alone, without a position', async () => {
    const { user, questId } = await attendingUser();

    const response = await addSubQuest(app, user, questId, { title: '저녁', place: { label: '서울대입구역' } });

    const place = { placeId: null, label: '서울대입구역', latitude: null, longitude: null };
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ title: '저녁', place });
    expect((await getQuest(app, user, questId)).body).toMatchObject({ subQuests: [{}, { place }] });
  });
});

describe('Adding a Sub Quest with an Idempotency-Key', () => {
  it('runs once for a repeated key and answers the same twice', async () => {
    const { user, questId } = await attendingUser();
    const key = randomUUID();

    const first = await addSubQuest(app, user, questId, cafe, key);
    const repeat = await addSubQuest(app, user, questId, cafe, key);

    expect(repeat.status).toBe(201);
    expect(repeat.headers['idempotent-replayed']).toBe('true');
    expect(repeat.body).toEqual(first.body);
    expect((await getQuest(app, user, questId)).body).toMatchObject({ subQuests: [{}, {}] });
  });

  it('needs a key', async () => {
    const { user, questId } = await attendingUser();

    const response = await addSubQuest(app, user, questId, cafe, null);

    expect(response.body).toMatchObject(refused(400, 'IDEMPOTENCY_KEY_REQUIRED'));
  });
});

describe('Adding a Sub Quest that breaks a rule', () => {
  it.each([
    ['an end before the start', { ...cafe, endsAt: '2026-10-13T18:00:00.000Z' }, /^endsAt: /u],
    ['an end at the start', { ...cafe, endsAt: cafe.startsAt }, /^endsAt: /u],
    ['no title', { title: ' ' }, /^title: /u],
    ['a point without a label', { title: '카페', place: { latitude: 37.46, longitude: 126.95 } }, /^place/u],
  ])('is refused with %s', async (_problem, content, message) => {
    const { user, questId } = await attendingUser();

    const response = await addSubQuest(app, user, questId, content);

    expect(response.status).toBe(400);
    expect(z.object({ message: z.array(z.string()) }).parse(response.body).message[0]).toMatch(message);
  });

  it('is refused with a Place that is not in the list', async () => {
    const { user, questId } = await attendingUser();

    const response = await addSubQuest(app, user, questId, { title: '스터디', place: { placeId: randomUUID() } });

    expect(response.body).toMatchObject(refused(404, 'PLACE_NOT_FOUND'));
  });

  it('is refused to a User who is not a Holder', async () => {
    const { questId } = await attendingUser();
    const stranger = await signInUser(app);

    const response = await addSubQuest(app, stranger, questId, cafe);

    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });

  it('is accepted when its time overlaps another Quest of the User', async () => {
    const { user, questId } = await attendingUser();
    const other = await questFor(app, user, (await storeEvent(prisma)).id);

    await subQuestIn(app, user, questId, cafe);
    const response = await addSubQuest(app, user, other.questId, cafe);

    expect(response.status).toBe(201);
  });
});

describe('Editing a Sub Quest', () => {
  it('replaces what a Holder wrote', async () => {
    const { user, questId } = await attendingUser();
    const subQuestId = await subQuestIn(app, user, questId, cafe);
    const placeId = await engineering1Id();

    const response = await editSubQuest(app, user, { questId, subQuestId }, { title: '스터디', place: { placeId } });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: subQuestId, title: '스터디', startsAt: null, endsAt: null });
    expect((await getQuest(app, user, questId)).body).toMatchObject({
      subQuests: [{ attending: true }, { title: '스터디', place: { placeId } }],
    });
  });

  it('is refused for the attending Sub Quest', async () => {
    const { user, questId, attendingId } = await attendingUser();

    const response = await editSubQuest(app, user, { questId, subQuestId: attendingId }, cafe);

    expect(response.body).toMatchObject(refused(409, 'ATTENDING_SUB_QUEST'));
  });

  it('is refused for a Sub Quest of another Quest, and to a User who is not a Holder', async () => {
    const { user, questId } = await attendingUser();
    const other = await attendingUser();
    const subQuestId = await subQuestIn(app, other.user, other.questId);

    const elsewhere = await editSubQuest(app, user, { questId, subQuestId }, cafe);
    const stranger = await editSubQuest(app, user, { questId: other.questId, subQuestId }, cafe);

    expect(elsewhere.body).toMatchObject(refused(404, 'SUB_QUEST_NOT_FOUND'));
    expect(stranger.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });

  it('replaces a point with words alone, and words alone with a Place', async () => {
    const { user, questId } = await attendingUser();
    const subQuestId = await subQuestIn(app, user, questId, cafe);
    const placeId = await engineering1Id();

    const toWords = await editSubQuest(app, user, { questId, subQuestId }, { title: '저녁', place: { label: '홍대' } });
    const toPlace = await editSubQuest(app, user, { questId, subQuestId }, { title: '저녁', place: { placeId } });

    expect(toWords.body).toMatchObject({ place: { placeId: null, label: '홍대', latitude: null, longitude: null } });
    expect(toPlace.body).toMatchObject({ place: { placeId, label: '제1공학관', ...engineering1 } });
  });
});

// Stores a Sub Quest with the place columns given, and the Place 제1공학관 when `withPlace`.
async function storeSubQuest(columns: object, withPlace = false): Promise<unknown> {
  const user = await signInUser(app);
  const questId = await ownQuest(app, user);
  const placeId = withPlace ? await engineering1Id() : null;
  return prisma.subQuest.create({ data: { questId, title: '저녁', placeId, ...columns } });
}

describe("The database's check on a Sub Quest's place", () => {
  it('keeps words without a point', async () => {
    await expect(storeSubQuest({ placeLabel: '서울대입구역' })).resolves.toMatchObject({ latitude: null });
  });

  it.each([
    ['a Place with a point', { ...engineering1, placeLabel: '공대' }, true],
    ['a Place with words', { placeLabel: '공대' }, true],
    ['a point without words', engineering1, false],
    ['a latitude without a longitude', { latitude: 37.45, placeLabel: '공대' }, false],
  ])('refuses %s', async (_problem, columns, withPlace) => {
    await expect(storeSubQuest(columns, withPlace)).rejects.toThrow('sub_quests_place_check');
  });
});

describe('Cancelling a Sub Quest', () => {
  it('removes a Sub Quest a Holder added', async () => {
    const { user, questId } = await attendingUser();
    const subQuestId = await subQuestIn(app, user, questId);

    const response = await cancelSubQuest(app, user, { questId, subQuestId });

    expect(response.status).toBe(204);
    expect((await getQuest(app, user, questId)).body).toMatchObject({ subQuests: [{ attending: true }] });
  });

  it('is refused for the attending Sub Quest', async () => {
    const { user, questId, attendingId } = await attendingUser();
    await subQuestIn(app, user, questId);

    const response = await cancelSubQuest(app, user, { questId, subQuestId: attendingId });

    expect(response.body).toMatchObject(refused(409, 'ATTENDING_SUB_QUEST'));
  });

  it('is refused for the only Sub Quest of a Quest', async () => {
    const user = await signInUser(app);
    const questId = await ownQuest(app, user);
    const [only] = await prisma.subQuest.findMany({ where: { questId } });

    const response = await cancelSubQuest(app, user, { questId, subQuestId: only?.id ?? '' });

    expect(response.body).toMatchObject(refused(409, 'LAST_SUB_QUEST'));
  });
});
