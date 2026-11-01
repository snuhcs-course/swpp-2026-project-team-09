/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { SeedTravel, type TravelProvider } from '../src/travel/travel.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase, ownQuest } from './quests.js';
import { ScriptedModel, type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { addClass } from './timetable.js';
import { refuseKakao } from './walking-route.js';

// The stage of the tests of the 공강 tools at the Assistant's endpoint: the app with the scripted model and a walking
// table of four Places, on a clock each test stands on a day of its own. The files share the database, so each test
// works on a day of 2098 that no other uses, and asks as a new User.

const NO_WAY = 99_999;

// A room of a Class, which the model must never be given.
export const ROOM = '비밀 강의실 101호';

const placeSchema = z.object({ id: z.string(), name: z.string(), latitude: z.number(), longitude: z.number() });

export type Place = z.infer<typeof placeSchema>;

// From `here` the shuttle takes 410 s, by a walk of 60 s to the first stop and one of 60 s from the second: a wait of
// 210 s and a ride of 80 s by day, and from 19:00 800 s. By day it is exactly 3 minutes faster than the walk to `near`
// and just under that to `barely`, and from 19:00 it still beats the walk to `far`.
const WALKS = [
  [0, 591, 590, 1500],
  [591, 0, NO_WAY, NO_WAY],
  [590, NO_WAY, 0, NO_WAY],
  [1500, NO_WAY, NO_WAY, 0],
];

function tableOf(places: readonly Place[]): SeedTravel {
  const stops = Array.from({ length: 14 }, (_, index) => ({ name: `${index}`, elevation: 0 }));
  return new SeedTravel(
    {
      builtFrom: 'test',
      copyright: 'test',
      places: places.map(({ id, name }) => ({ id, name, elevation: 0 })),
      stops,
      placeToPlace: WALKS,
      placeToStop: places.map((_, row) => stops.map((_stop, stop) => (row === 0 && stop === 0 ? 60 : NO_WAY))),
      stopToPlace: stops.map((_stop, stop) => places.map((_, column) => (stop === 1 && column > 0 ? 60 : NO_WAY))),
    },
    { days: [], waits: {}, rides: {} },
  );
}

export interface Meeting {
  date: string;
  start: string;
  end?: string;
  place: object;
}

export const inKorea = (date: string, time: string): string => new Date(`${date}T${time}:00+09:00`).toISOString();

export function subQuestOf({ date, start, end, place }: Meeting): object {
  return {
    title: '모임',
    startsAt: inKorea(date, start),
    endsAt: end === undefined ? null : inKorea(date, end),
    place,
  };
}

const foundSchema = z.looseObject({
  result: z.literal('found'),
  gaps: z.array(z.looseObject({ start: z.string(), end: z.string() })),
  candidates: z.array(z.looseObject({ id: z.string() })),
});

export type Found = z.infer<typeof foundSchema>;

const replySchema = z.object({ cards: z.array(z.looseObject({ kind: z.string() })) });

export interface Shown {
  id: string;
  // The card's fields beside the Quest or the Global Event.
  rest: object;
}

export function shownCards(body: unknown): Shown[] {
  return replySchema.parse(body).cards.map(({ kind, quest, globalEvent, ...rest }) => ({
    id: z.object({ id: z.string() }).parse(kind === 'quest' ? quest : globalEvent).id,
    rest,
  }));
}

export class FreeTimeStage {
  readonly model = new ScriptedModel();
  app!: INestApplication<Server>;
  prisma!: PrismaClient;
  reader!: TestUser;
  here!: Place;
  near!: Place;
  barely!: Place;
  far!: Place;
  private leader!: TestUser;
  private now = new Date('2098-01-01T09:00:00+09:00');
  private seedTravel!: SeedTravel;

  async start(): Promise<void> {
    const travel: TravelProvider = {
      travel: (from, to, departure) => this.seedTravel.travel(from, to, departure),
      walkingSeconds: (from, to) => this.seedTravel.walkingSeconds(from, to),
    };
    const { model } = this.model;
    this.app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model, [], travel);
    vi.spyOn(this.app.get<Clock>(CLOCK), 'now').mockImplementation(() => this.now);
    this.prisma = connectToDatabase();
    this.leader = await signInUser(this.app);
    this.here = await this.placeNamed('제1공학관');
    this.near = await this.placeNamed('제2공학관');
    this.barely = await this.placeNamed('학생회관');
    this.far = await this.placeNamed('체육관');
    this.seedTravel = tableOf([this.here, this.near, this.barely, this.far]);
  }

  async stop(): Promise<void> {
    await this.prisma.$disconnect();
    await this.app.close();
  }

  // Stands the clock on the morning of that day, for a new User.
  async asking(date: string): Promise<void> {
    this.now = new Date(`${date}T07:00:00+09:00`);
    this.reader = await signInUser(this.app);
  }

  // Adds a Class to the User and answers its meeting's id.
  async classOn(weekday: string, startTime: string, endTime: string, placeId: string | null): Promise<string> {
    const times = [{ weekday, startTime, endTime, placeId, room: ROOM }];
    const { accessToken } = this.reader;
    const added = await addClass(this.app, accessToken, { courseName: '자료구조', times });
    return added.times[0]?.id ?? '';
  }

  // Makes a Quest for the User to find, Open on the hobby Board.
  questAt(meeting: Meeting, title = '모임'): Promise<string> {
    const subQuest = subQuestOf(meeting);
    return ownQuest(this.app, this.leader, { title, joinPolicy: 'open', board: 'hobby', subQuest });
  }

  // Sends one message of the User's, for the model to take these steps.
  send(...steps: Step[]): request.Test {
    this.model.script(...steps);
    return postAssistantMessages(this.app, this.reader.accessToken, ask('…'));
  }

  // Asks what fits from `from` to `to`, and answers what the tool returned.
  async find(date: string, from: string, to: string, more: object = {}): Promise<Found> {
    const response = await this.send({ tool: 'findFreeTimeEvents', input: { date, from, to, ...more } }, { text: '…' });
    expect(response.status).toBe(200);
    return foundSchema.parse(this.model.toolResults()[0]);
  }

  private async placeNamed(name: string): Promise<Place> {
    const response = await withAccessToken(request(this.app.getHttpServer()).get('/places'), this.leader.accessToken);
    const place = z
      .array(placeSchema)
      .parse(response.body)
      .find((each) => each.name === name);
    if (place === undefined) {
      throw new Error(`The seed has no Place named ${name}`);
    }
    return place;
  }
}
