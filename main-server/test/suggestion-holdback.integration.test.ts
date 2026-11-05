/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { performance } from 'node:perf_hooks';
import { inject } from 'vitest';
import { type RandomSource, SUGGESTION_RANDOM } from '../src/assistant/suggestions/random.js';
import { Place, PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { startApp } from './start-app.js';
import {
  getSuggestion,
  korea,
  mondayClass,
  storeImpressions,
  storeLedQuest,
  suggestionFor,
  twoPlaces,
  weeksAfter,
} from './suggestions.js';

// The holdback, with one app that holds back no account and one that holds back every account, and the time
// GET /assistant/suggestion takes with every template eligible. The apps' clocks stand on Mondays of 2105, which no
// other file uses, each test six weeks after the one before.

let app: INestApplication<Server>;
let heldBackApp: INestApplication<Server>;
let prisma: PrismaClient;
let place301: Place;

const FIRST_MONDAY = '2105-01-05';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function fixClockAndRandom(started: INestApplication<Server>, now: Date): void {
  vi.spyOn(started.get<Clock>(CLOCK), 'now').mockReturnValue(now);
  vi.spyOn(started.get<RandomSource>(SUGGESTION_RANDOM), 'next').mockReturnValue(0.5);
}

beforeAll(async () => {
  app = await startApp(inject('settings'));
  heldBackApp = await startApp({ ...inject('settings'), ASSISTANT_SUGGESTION_HOLDBACK_PERCENT: '100' });
  prisma = connectToDatabase();
  [place301] = await twoPlaces(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  await Promise.all([app.close(), heldBackApp.close()]);
});

// A habit of lunch at 12:00 at 301동 on the two days before the Monday, and an event two days after it, open.
async function habitAndEvent(user: TestUser, monday: string): Promise<Record<string, string>> {
  const noon = korea(monday, '12:00').getTime();
  await storeLedQuest(prisma, user.id, new Date(noon - 2 * DAY_MS), place301.id);
  await storeLedQuest(prisma, user.id, new Date(noon - DAY_MS), place301.id);
  const startsAt = new Date(noon + 2 * DAY_MS);
  const event = await storeEvent(prisma, {
    title: '2105 학술제',
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR_MS),
  });
  return { screen: 'main', openCard: `globalEvent:${event.id}` };
}

function impressionOf(id: string | undefined): Promise<object | null> {
  return prisma.suggestionImpression.findUnique({
    where: { id },
    select: { template: true, eligible: true, holdback: true },
  });
}

describe('the holdback', () => {
  it('scores a held-back account by the base weights only, and records it', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const monday = korea(FIRST_MONDAY, '09:00');
    const card = await habitAndEvent(user, FIRST_MONDAY);
    await storeImpressions(prisma, other.id, 'repeat_last', 'morning', monday, { shown: 8, accepted: 0 });
    fixClockAndRandom(app, monday);
    fixClockAndRandom(heldBackApp, monday);

    // 1.2 × 0.1 × 2 for the habit is under the threshold, so the event shows.
    const learned = await suggestionFor(app, user, card);
    // 1.2 × 0.5 for the habit is over the event's 1.0 × 0.5.
    const base = await suggestionFor(heldBackApp, user, card);

    await expect(impressionOf(learned?.id)).resolves.toEqual({
      template: 'party_for_open_event',
      eligible: ['party_for_open_event', 'repeat_last'],
      holdback: false,
    });
    await expect(impressionOf(base?.id)).resolves.toEqual({
      template: 'repeat_last',
      eligible: ['repeat_last', 'party_for_open_event'],
      holdback: true,
    });
  });
});

describe('the time it takes', () => {
  it('answers within 300 ms with every template eligible', async () => {
    const [user, ...friends] = await Promise.all(
      ['홍길동', '가람', '나래', '다솜'].map((name) => signInUser(app, { name, department: '컴퓨터공학부' })),
    );
    await Promise.all(friends.map((friend) => befriend(app, user, friend)));
    await Promise.all([
      mondayClass(app, user, '09:00', '11:30'),
      mondayClass(app, user, '12:30', '13:45', place301.id),
      ...friends.map((friend) => mondayClass(app, friend, '09:00', '11:00')),
    ]);
    const monday = korea(weeksAfter(FIRST_MONDAY, 6), '11:40');
    const card = await habitAndEvent(user, weeksAfter(FIRST_MONDAY, 6));
    fixClockAndRandom(app, monday);
    await getSuggestion(app, user, card);

    const started = performance.now();
    const answered = await suggestionFor(app, user, card);
    const took = performance.now() - started;

    await expect(prisma.suggestionImpression.findUnique({ where: { id: answered?.id } })).resolves.toMatchObject({
      eligible: expect.arrayContaining([
        'lunch_with_free_friend',
        'route_to_next_class',
        'party_for_open_event',
        'repeat_last',
      ]) as unknown,
    });
    expect(took).toBeLessThan(300);
  });
});
