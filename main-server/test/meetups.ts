// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #44
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { befriend, signInUser, TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';

const HOUR = 60 * 60 * 1000;

// What a Meetup a day from now, for an hour at a point on the map, is proposed with.
export function lunch(): { title: string; startsAt: string; endsAt: string; place: object } {
  const startsAt = new Date(Date.now() + 24 * HOUR);
  return {
    title: '점심',
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + HOUR).toISOString(),
    place: { latitude: 37.4601, longitude: 126.9512, label: '자하연 앞' },
  };
}

export function proposeMeetup(
  app: INestApplication<Server>,
  proposer: TestUser,
  body: object,
  key: string | null = randomUUID(),
): request.Test {
  const call = withAccessToken(request(app.getHttpServer()).post('/meetups'), proposer.accessToken).send(body);
  return key === null ? call : call.set('Idempotency-Key', key);
}

export function getMeetups(app: INestApplication<Server>, user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/meetups'), user.accessToken);
}

export function answerMeetup(
  app: INestApplication<Server>,
  user: TestUser,
  meetupId: string,
  answer: 'accept' | 'decline' | 'withdraw',
): request.Test {
  return withAccessToken(request(app.getHttpServer()).post(`/meetups/${meetupId}/${answer}`), user.accessToken);
}

// Proposes a Meetup and answers its id.
export async function meetupBetween(
  app: INestApplication<Server>,
  proposer: TestUser,
  receiver: TestUser,
  content: object = lunch(),
): Promise<string> {
  const response = await proposeMeetup(app, proposer, { receiverId: receiver.id, ...content });
  if (response.status !== 201) {
    throw new Error(`Proposing a Meetup answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return z.object({ id: z.string() }).parse(response.body).id;
}

const meetupsSchema = z.object({
  received: z.array(z.object({ id: z.string(), state: z.string() })),
  sent: z.array(z.object({ id: z.string(), state: z.string() })),
});

// The state of the Meetup as each of the two lists it.
export async function statesOf(
  app: INestApplication<Server>,
  meetupId: string,
  proposer: TestUser,
  receiver: TestUser,
): Promise<{ proposer: string | undefined; receiver: string | undefined }> {
  const { sent } = meetupsSchema.parse((await getMeetups(app, proposer)).body);
  const { received } = meetupsSchema.parse((await getMeetups(app, receiver)).body);
  return {
    proposer: sent.find(({ id }) => id === meetupId)?.state,
    receiver: received.find(({ id }) => id === meetupId)?.state,
  };
}

// Two new Users who are Friends.
export async function friends(app: INestApplication<Server>): Promise<[TestUser, TestUser]> {
  const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);
  await befriend(app, first, second);
  return [first, second];
}
