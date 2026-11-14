/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { befriend, signInUser, type TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { menusMessage, restaurant } from './menus.js';
import { ScriptedModel, type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { addClass } from './timetable.js';
import { refuseKakao } from './walking-route.js';
import { sendAsWorker } from './worker.js';

// The stage of the tests of a meal's plan at the Assistant's endpoint: the app with the scripted model, the seed's
// walking table, and Places, on a clock each test stands on a time of a day of its own. The files share the database,
// so each test works on a Tuesday of 2087, which no other file posts menus for, and asks as a new User.

// A course name and a room of every Class here, which neither the model nor the reply may hold.
export const COURSE = '비밀스러운 알고리즘 특강';
export const ROOM = '비밀 강의실 101호';

const placeSchema = z.object({
  id: z.string(),
  number: z.string().nullable(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export type Place = z.infer<typeof placeSchema>;

export type Named = TestUser & { name: string };

export class MealPlanStage {
  readonly model = new ScriptedModel();
  app!: INestApplication<Server>;
  asker!: Named;
  private now = new Date('2087-01-06T09:00:00+09:00');
  private places: Place[] = [];

  async start(): Promise<void> {
    this.app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, this.model.model);
    vi.spyOn(this.app.get<Clock>(CLOCK), 'now').mockImplementation(() => this.now);
  }

  stop(): Promise<void> {
    return this.app.close();
  }

  // Stands the clock on that time of the day, for a new asker of that name.
  async asking(date: string, clock: string, name = '유상'): Promise<void> {
    this.now = new Date(`${date}T${clock}:00+09:00`);
    this.asker = await this.user(name);
  }

  // A new User who is the asker's Friend.
  async friend(name: string): Promise<Named> {
    const friend = await this.user(name);
    await befriend(this.app, this.asker, friend);
    return friend;
  }

  // Adds a Tuesday Class in the building of that number.
  async classAt(user: TestUser, start: string, end: string, number: string): Promise<void> {
    const times = [
      { weekday: 'tuesday', startTime: start, endTime: end, placeId: (await this.numbered(number)).id, room: ROOM },
    ];
    await addClass(this.app, user.accessToken, { courseName: COURSE, times });
  }

  // Posts the day's menus as the worker does, each Restaurant serving lunch.
  async menusOn(date: string, names: readonly string[]): Promise<void> {
    const restaurants = names.map((name) => restaurant({ name }));
    await sendAsWorker(this.app, '/menus/collected', menusMessage([{ date, restaurants }]));
  }

  // The Place of that number, as GET /places gives it.
  async numbered(number: string): Promise<Place> {
    if (this.places.length === 0) {
      const response = await withAccessToken(request(this.app.getHttpServer()).get('/places'), this.asker.accessToken);
      this.places = z.array(placeSchema).parse(response.body);
    }
    const place = this.places.find((each) => each.number === number);
    if (place === undefined) {
      throw new Error(`The seed has no Place numbered ${number}`);
    }
    return place;
  }

  // Sends one message of the asker's from an app that draws answers, for the model to take these steps.
  send(steps: Step[], more: object = {}): request.Test {
    this.model.script(...steps);
    return postAssistantMessages(this.app, this.asker.accessToken, ask('배고파'), {
      clientCapabilities: ['library', 'answer'],
      ...more,
    });
  }

  private async user(name: string): Promise<Named> {
    return { ...(await signInUser(this.app, { name, department: '컴퓨터공학부' })), name };
  }
}

export const resolve = (name: string): Step => ({ tool: 'resolveFriend', input: { name } });

export const planMeal = (date: string, friendIds: string[] = []): Step => ({
  tool: 'planMeal',
  input: { date, meal: 'lunch', friendIds },
});
