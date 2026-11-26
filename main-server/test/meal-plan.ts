/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-20  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type Hours } from '../src/menus/restaurant-hours.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { type TravelProvider } from '../src/travel/travel.js';
import { type UsageClientFactory } from '../src/usage/usage.service.js';
import { ask, postAssistantMessages } from './assistant.js';
import { ownDatabase } from './containers.js';
import { befriend, signInUser, type TestUser } from './friends.js';
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

interface StartOptions {
  settings?: object;
  posthog?: UsageClientFactory;
  ownDatabase?: boolean;
}

export class MealPlanStage {
  readonly model = new ScriptedModel();
  app!: INestApplication<Server>;
  asker!: Named;
  private now = new Date('2087-01-06T09:00:00+09:00');
  private places: Place[] = [];
  // Each Restaurant's hours by meal, which a test gives: those kept in the shared database belong to no day, so the
  // plans here read none other.
  private hours: Record<string, Partial<Record<'lunch' | 'dinner', Hours>>> = {};

  // A travel provider of the test's own in place of the seed's.
  constructor(private readonly travel?: TravelProvider) {}

  private dropDatabase?: () => Promise<void>;

  // `settings` over the tests' own, `posthog` in PostHog's client's place, for a test of the usage events, and a
  // database of its own (test/containers.ts) for a file that makes room requests, which a read sweeps by its clock.
  async start({ settings = {}, posthog, ownDatabase: own = false }: StartOptions = {}): Promise<void> {
    const { model } = this.model;
    let all = { ...inject('settings'), ...settings };
    if (own) {
      const database = await ownDatabase(all);
      this.dropDatabase = database.drop;
      all = database.settings;
    }
    this.app = await startApp(all, [], refuseKakao, model, [], this.travel, undefined, { posthog });
    vi.spyOn(this.app.get<Clock>(CLOCK), 'now').mockImplementation(() => this.now);
    // Imported after startApp, so that it is the class AppModule registers.
    const { RestaurantHours } = await import('../src/menus/restaurant-hours.js');
    vi.spyOn(this.app.get(RestaurantHours), 'hoursOf').mockImplementation((name, meal) =>
      Promise.resolve(meal === 'lunch' || meal === 'dinner' ? (this.hours[name]?.[meal] ?? null) : null),
    );
  }

  async stop(): Promise<void> {
    await this.app.close();
    await this.dropDatabase?.();
  }

  // Stands the clock on that time of the day, for a new asker of that name.
  async asking(date: string, clock: string, name = '유상'): Promise<void> {
    this.now = new Date(`${date}T${clock}:00+09:00`);
    this.hours = {};
    this.asker = await this.user(name);
  }

  // Moves the clock on to a moment off the minute, as a request lands, for the same asker.
  standAt(moment: string): void {
    this.now = new Date(moment);
  }

  // The hours the plans read for each Restaurant, until the next `asking`.
  hoursAre(hours: Record<string, Partial<Record<'lunch' | 'dinner', Hours>>>): void {
    this.hours = hours;
  }

  // A new User who is the asker's Friend.
  async friend(name: string, department?: string): Promise<Named> {
    const friend = await this.user(name, department);
    await befriend(this.app, this.asker, friend);
    return friend;
  }

  // Adds a Class in the building of that number, on Tuesdays unless another day is given, and gives the id of its time.
  async classAt(
    user: TestUser,
    start: string,
    end: string,
    number: string,
    weekday = 'tuesday',
    courseName = COURSE,
  ): Promise<string> {
    const times = [{ weekday, startTime: start, endTime: end, placeId: (await this.numbered(number)).id, room: ROOM }];
    const added = await addClass(this.app, user.accessToken, { courseName, times });
    const [time] = added.times;
    if (time === undefined) {
      throw new Error('A Class added has its time');
    }
    return time.id;
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
  send(steps: Step[], more: object = {}, text = '배고파'): request.Test {
    this.model.script(...steps);
    return postAssistantMessages(this.app, this.asker.accessToken, ask(text), {
      clientCapabilities: ['library', 'answer'],
      ...more,
    });
  }

  private async user(name: string, department = '컴퓨터공학부'): Promise<Named> {
    return { ...(await signInUser(this.app, { name, department })), name };
  }
}

export const resolve = (name: string): Step => ({ tool: 'resolveFriend', input: { name } });

export const planMeal = (date: string, friendIds: string[] = []): Step => ({
  tool: 'planMeal',
  input: { date, meal: 'lunch', friendIds },
});
