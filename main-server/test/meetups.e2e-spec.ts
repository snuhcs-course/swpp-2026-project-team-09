import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser } from './friends.js';
import { friends, getMeetups, lunch, proposeMeetup } from './meetups.js';
import { connectToDatabase } from './quests.js';
import { ANY_STRING, refused } from './signals.js';
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

describe('Proposing a Meetup', () => {
  it('proposes it to a Friend at a point on the map, and both list it', async () => {
    const [proposer, receiver] = await friends(app);
    const content = lunch();

    const response = await proposeMeetup(app, proposer, { receiverId: receiver.id, ...content });

    const meetup = {
      id: ANY_STRING,
      title: '점심',
      startsAt: content.startsAt,
      endsAt: content.endsAt,
      place: { placeId: null, label: '자하연 앞', latitude: 37.4601, longitude: 126.9512 },
      state: 'proposed',
      proposer: { id: proposer.id, name: '홍길동', department: '컴퓨터공학부' },
      receiver: { id: receiver.id, name: '홍길동', department: '컴퓨터공학부' },
    };
    expect(response.status).toBe(201);
    expect(response.body).toEqual(meetup);
    expect((await getMeetups(app, receiver)).body).toEqual({ received: [meetup], sent: [] });
    expect((await getMeetups(app, proposer)).body).toEqual({ received: [], sent: [meetup] });
  });

  it('takes a Place from the list, and no end', async () => {
    const [proposer, receiver] = await friends(app);
    const place = await prisma.place.findFirstOrThrow({ where: { number: '301', origin: 'campus_map' } });

    const response = await proposeMeetup(app, proposer, {
      receiverId: receiver.id,
      ...lunch(),
      endsAt: undefined,
      place: { placeId: place.id },
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      endsAt: null,
      place: { placeId: place.id, label: '제1공학관', latitude: place.latitude, longitude: place.longitude },
    });
  });
});

describe('Proposing a Meetup with an Idempotency-Key', () => {
  it('runs once for a repeated key and answers the same twice', async () => {
    const [proposer, receiver] = await friends(app);
    const body = { receiverId: receiver.id, ...lunch() };
    const key = randomUUID();

    const first = await proposeMeetup(app, proposer, body, key);
    const repeat = await proposeMeetup(app, proposer, body, key);

    expect(repeat.status).toBe(201);
    expect(repeat.headers['idempotent-replayed']).toBe('true');
    expect(repeat.body).toEqual(first.body);
    expect((await getMeetups(app, receiver)).body).toMatchObject({ received: [{}] });
  });

  it('needs a key', async () => {
    const [proposer, receiver] = await friends(app);

    const response = await proposeMeetup(app, proposer, { receiverId: receiver.id, ...lunch() }, null);

    expect(response.body).toMatchObject(refused(400, 'IDEMPOTENCY_KEY_REQUIRED'));
  });
});

describe('Proposing a Meetup whose content breaks a rule', () => {
  it.each([
    ['no place', { place: undefined }, /^place: /u],
    ['no start', { startsAt: undefined }, /^startsAt: /u],
    ['an end before the start', { endsAt: new Date().toISOString() }, /^endsAt: /u],
    ['no title', { title: ' ' }, /^title: /u],
  ])('is refused with %s', async (_problem, changes, message) => {
    const [proposer, receiver] = await friends(app);

    const response = await proposeMeetup(app, proposer, { receiverId: receiver.id, ...lunch(), ...changes });

    expect(response.status).toBe(400);
    expect(z.object({ message: z.array(z.string()) }).parse(response.body).message[0]).toMatch(message);
  });

  it('is refused with a start that has passed', async () => {
    const [proposer, receiver] = await friends(app);
    const content = lunch();
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date(content.startsAt));

    const response = await proposeMeetup(app, proposer, { receiverId: receiver.id, ...content });

    expect(response.body).toMatchObject(refused(400, 'MEETUP_START_PASSED'));
  });

  it('is refused with a Place that is not in the list', async () => {
    const [proposer, receiver] = await friends(app);

    const response = await proposeMeetup(app, proposer, {
      receiverId: receiver.id,
      ...lunch(),
      place: { placeId: randomUUID() },
    });

    expect(response.body).toMatchObject(refused(404, 'PLACE_NOT_FOUND'));
  });
});

describe('Proposing a Meetup to a User who is not a Friend', () => {
  it('is refused, also to the proposer', async () => {
    const [proposer, stranger] = await Promise.all([signInUser(app), signInUser(app)]);

    const toStranger = await proposeMeetup(app, proposer, { receiverId: stranger.id, ...lunch() });
    const toSelf = await proposeMeetup(app, proposer, { receiverId: proposer.id, ...lunch() });

    expect(toStranger.body).toMatchObject(refused(404, 'FRIEND_NOT_FOUND'));
    expect(toSelf.body).toMatchObject(refused(404, 'FRIEND_NOT_FOUND'));
    expect((await getMeetups(app, stranger)).body).toEqual({ received: [], sent: [] });
  });
});
