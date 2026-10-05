import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { befriend, endFriendship, signInUser } from './friends.js';
import { answerMeetup, friends, lunch, meetupBetween, statesOf } from './meetups.js';
import { connectToDatabase, getQuests } from './quests.js';
import { withAccessToken } from './sign-in.js';
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

function setClock(at: Date): void {
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(at);
}

describe('Accepting a Meetup', () => {
  it('gives both a Closed Quest the proposer leads, without a Global Event and with a Sub Quest from the Meetup', async () => {
    const [proposer, receiver] = await friends(app);
    const content = lunch();
    const meetupId = await meetupBetween(app, proposer, receiver, content);

    const response = await answerMeetup(app, receiver, meetupId, 'accept');

    const subQuest = {
      id: ANY_STRING,
      attending: false,
      title: '점심',
      startsAt: content.startsAt,
      endsAt: content.endsAt,
      place: { placeId: null, label: '자하연 앞', latitude: 37.4601, longitude: 126.9512 },
      completion: 'by_time',
      cancelled: false,
      done: false,
      ended: false,
    };
    const [leader, other] = [proposer, receiver].map(({ id }) => ({ id, name: '홍길동', department: '컴퓨터공학부' }));
    const quest = { id: ANY_STRING, title: '점심', globalEvent: null, leader, capacity: 4, joinPolicy: 'closed' };
    expect(response.status).toBe(204);
    expect(await statesOf(app, meetupId, proposer, receiver)).toEqual({ proposer: 'accepted', receiver: 'accepted' });
    const forProposer = await getQuests(app, proposer);
    expect(forProposer.body).toEqual([{ ...quest, holders: [leader, other], subQuests: [subQuest] }]);
    expect((await getQuests(app, receiver)).body).toEqual(forProposer.body);
  });

  it('leaves one Quest when it is accepted twice at the same moment', async () => {
    const [proposer, receiver] = await friends(app);
    const meetupId = await meetupBetween(app, proposer, receiver);

    const answers = await Promise.all([
      answerMeetup(app, receiver, meetupId, 'accept'),
      answerMeetup(app, receiver, meetupId, 'accept'),
    ]);

    expect(answers.map(({ status }) => status).toSorted((a, b) => a - b)).toEqual([204, 409]);
    expect((await getQuests(app, receiver)).body).toHaveLength(1);
    expect((await getQuests(app, proposer)).body).toHaveLength(1);
  });
});

describe('Declining and withdrawing a Meetup', () => {
  it('declines it, for the receiver, which gives no Quest', async () => {
    const [proposer, receiver] = await friends(app);
    const meetupId = await meetupBetween(app, proposer, receiver);

    const response = await answerMeetup(app, receiver, meetupId, 'decline');

    expect(response.status).toBe(204);
    expect(await statesOf(app, meetupId, proposer, receiver)).toEqual({ proposer: 'declined', receiver: 'declined' });
    expect((await getQuests(app, receiver)).body).toEqual([]);
  });

  it('withdraws it, for the proposer', async () => {
    const [proposer, receiver] = await friends(app);
    const meetupId = await meetupBetween(app, proposer, receiver);

    const response = await answerMeetup(app, proposer, meetupId, 'withdraw');

    expect(response.status).toBe(204);
    expect(await statesOf(app, meetupId, proposer, receiver)).toEqual({
      proposer: 'withdrawn',
      receiver: 'withdrawn',
    });
  });
});

describe('Answering a Meetup that is not the User’s to answer', () => {
  it.each(['accept', 'decline'] as const)('is refused to the proposer and to a stranger: %s', async (answer) => {
    const [proposer, receiver] = await friends(app);
    const stranger = await signInUser(app);
    const meetupId = await meetupBetween(app, proposer, receiver);

    const byProposer = await answerMeetup(app, proposer, meetupId, answer);
    const byStranger = await answerMeetup(app, stranger, meetupId, answer);
    const unknown = await answerMeetup(app, receiver, randomUUID(), answer);

    for (const response of [byProposer, byStranger, unknown]) {
      expect(response.body).toMatchObject(refused(404, 'MEETUP_NOT_FOUND'));
    }
    expect(await statesOf(app, meetupId, proposer, receiver)).toEqual({ proposer: 'proposed', receiver: 'proposed' });
  });

  it('withdrawing is refused to the receiver', async () => {
    const [proposer, receiver] = await friends(app);
    const meetupId = await meetupBetween(app, proposer, receiver);

    const response = await answerMeetup(app, receiver, meetupId, 'withdraw');

    expect(response.body).toMatchObject(refused(404, 'MEETUP_NOT_FOUND'));
  });
});

describe('A Meetup that was answered', () => {
  it.each([
    ['accepted', 'accept'],
    ['declined', 'decline'],
    ['withdrawn', 'withdraw'],
  ] as const)('cannot be answered again once %s', async (_state, first) => {
    const [proposer, receiver] = await friends(app);
    const meetupId = await meetupBetween(app, proposer, receiver);
    await answerMeetup(app, first === 'withdraw' ? proposer : receiver, meetupId, first);

    const accept = await answerMeetup(app, receiver, meetupId, 'accept');
    const decline = await answerMeetup(app, receiver, meetupId, 'decline');
    const withdraw = await answerMeetup(app, proposer, meetupId, 'withdraw');

    for (const response of [accept, decline, withdraw]) {
      expect(response.body).toMatchObject(refused(409, 'MEETUP_NOT_PROPOSED'));
    }
  });

  it('has no route that edits it', async () => {
    const [proposer, receiver] = await friends(app);
    const meetupId = await meetupBetween(app, proposer, receiver);

    const response = await withAccessToken(
      request(app.getHttpServer()).put(`/meetups/${meetupId}`),
      proposer.accessToken,
    ).send({ receiverId: receiver.id, ...lunch(), title: '저녁' });

    expect(response.status).toBe(404);
  });
});

describe('A Meetup whose start has passed', () => {
  it('is expired, without a write, and cannot be accepted, declined or withdrawn', async () => {
    const [proposer, receiver] = await friends(app);
    const content = lunch();
    const meetupId = await meetupBetween(app, proposer, receiver, content);

    setClock(new Date(new Date(content.startsAt).getTime() - 1));
    const before = await statesOf(app, meetupId, proposer, receiver);
    setClock(new Date(content.startsAt));
    const after = await statesOf(app, meetupId, proposer, receiver);
    const accept = await answerMeetup(app, receiver, meetupId, 'accept');
    const decline = await answerMeetup(app, receiver, meetupId, 'decline');
    const withdraw = await answerMeetup(app, proposer, meetupId, 'withdraw');

    expect(before).toEqual({ proposer: 'proposed', receiver: 'proposed' });
    expect(after).toEqual({ proposer: 'expired', receiver: 'expired' });
    for (const response of [accept, decline, withdraw]) {
      expect(response.body).toMatchObject(refused(409, 'MEETUP_NOT_PROPOSED'));
    }
    expect(await prisma.meetup.findUniqueOrThrow({ where: { id: meetupId } })).toMatchObject({ state: 'proposed' });
  });
});

describe('Ending a friendship', () => {
  it('withdraws the Meetups still proposed between the two, either way', async () => {
    const [first, second] = await friends(app);
    const sent = await meetupBetween(app, first, second);
    const received = await meetupBetween(app, second, first);

    await endFriendship(app, first, second.id);

    expect(await statesOf(app, sent, first, second)).toEqual({ proposer: 'withdrawn', receiver: 'withdrawn' });
    expect(await statesOf(app, received, second, first)).toEqual({ proposer: 'withdrawn', receiver: 'withdrawn' });
  });

  it('leaves the Quest of an accepted Meetup to both', async () => {
    const [first, second] = await friends(app);
    const meetupId = await meetupBetween(app, first, second);
    await answerMeetup(app, second, meetupId, 'accept');

    await endFriendship(app, second, first.id);

    expect(await statesOf(app, meetupId, first, second)).toEqual({ proposer: 'accepted', receiver: 'accepted' });
    expect((await getQuests(app, first)).body).toMatchObject([{ title: '점심', holders: [{}, {}] }]);
    expect((await getQuests(app, second)).body).toMatchObject([{ title: '점심', holders: [{}, {}] }]);
  });

  it('leaves the Meetups with other Friends', async () => {
    const [first, second] = await friends(app);
    const other = await signInUser(app);
    await befriend(app, first, other);
    const meetupId = await meetupBetween(app, first, other);

    await endFriendship(app, first, second.id);

    expect(await statesOf(app, meetupId, first, other)).toEqual({ proposer: 'proposed', receiver: 'proposed' });
  });
});
