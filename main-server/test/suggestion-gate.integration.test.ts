/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { type RandomSource, SUGGESTION_RANDOM } from '../src/assistant/suggestions/random.js';
import { PrismaClient, SuggestionOutcome } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { startApp } from './start-app.js';
import { korea, suggestionFor, weeksAfter } from './suggestions.js';

// The gate before the templates (research note 12 §2.1, Pre-Filtering, ASEW 2025): a User who ignored the last five
// suggestions is shown nothing, whatever the templates score, and the row says so. The apps' clocks stand on Mondays
// of 2107, which no other file uses, each test six weeks after the one before.

let app: INestApplication<Server>;
let heldBackApp: INestApplication<Server>;
let prisma: PrismaClient;

const FIRST_MONDAY = '2107-01-03';
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// A number near the value, typed so that lint lets it into an expected object.
const about = (value: number): unknown => expect.closeTo(value, 6);

beforeAll(async () => {
  app = await startApp(inject('settings'));
  heldBackApp = await startApp({ ...inject('settings'), ASSISTANT_SUGGESTION_HOLDBACK_PERCENT: '100' });
  prisma = connectToDatabase();
  for (const started of [app, heldBackApp]) {
    vi.spyOn(started.get<RandomSource>(SUGGESTION_RANDOM), 'next').mockReturnValue(0.5);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
  await Promise.all([app.close(), heldBackApp.close()]);
});

// Noon of the Monday of week `weeks`, with an event two days later open on the events screen: party_for_open_event is
// then the one eligible template and, at the prior's acceptance, over its threshold.
async function noonWithEvent(weeks: number): Promise<{ noon: Date; card: Record<string, string> }> {
  const monday = weeksAfter(FIRST_MONDAY, weeks);
  const startsAt = new Date(korea(monday, '18:00').getTime() + 2 * DAY_MS);
  const event = await storeEvent(prisma, {
    title: `2107 학술제 ${weeks}주`,
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR_MS),
  });
  return { noon: korea(monday, '12:00'), card: { screen: 'events', openCard: `globalEvent:${event.id}` } };
}

// 19:00 in Korea, `days` days before the noon given.
function eveningBefore(noon: Date, days: number): Date {
  return new Date(noon.getTime() - days * DAY_MS + 7 * HOUR_MS);
}

// Route suggestions shown to the User at the time given, ignored unless another outcome is given.
async function storeShown(
  user: TestUser,
  shownAt: Date,
  count: number,
  outcome: SuggestionOutcome = SuggestionOutcome.shown,
): Promise<void> {
  await prisma.suggestionImpression.createMany({
    data: Array.from({ length: count }, () => ({
      userId: user.id,
      template: 'route_to_next_class',
      eligible: ['route_to_next_class'],
      bucket: 'evening',
      propensity: 1,
      holdback: false,
      receptiveness: 0.5,
      gated: false,
      shownAt,
      outcome,
      outcomeAt: outcome === SuggestionOutcome.shown ? null : shownAt,
    })),
  });
}

function lastRowOf(user: TestUser): Promise<object | null> {
  return prisma.suggestionImpression.findFirst({
    where: { userId: user.id },
    orderBy: { shownAt: 'desc' },
    select: { template: true, eligible: true, outcome: true, holdback: true, receptiveness: true, gated: true },
  });
}

function fixClock(started: INestApplication<Server>, now: Date): void {
  vi.spyOn(started.get<Clock>(CLOCK), 'now').mockReturnValue(now);
}

describe('the gate', () => {
  it('shows nothing to a User who ignored the last five suggestions, and says so', async () => {
    const user = await signInUser(app);
    const { noon, card } = await noonWithEvent(0);
    await storeShown(user, eveningBefore(noon, 1), 5);
    fixClock(app, noon);

    await expect(suggestionFor(app, user, card)).resolves.toBeNull();

    await expect(lastRowOf(user)).resolves.toEqual({
      template: null,
      eligible: ['party_for_open_event'],
      outcome: 'silent',
      holdback: false,
      receptiveness: about(1 / 7),
      gated: true,
    });
  });

  it('shows to a User who ignored four, and to one whose five are over a week old', async () => {
    const [four, old] = await Promise.all([signInUser(app), signInUser(app)]);
    const { noon, card } = await noonWithEvent(6);
    await Promise.all([storeShown(four, eveningBefore(noon, 1), 4), storeShown(old, eveningBefore(noon, 8), 5)]);
    fixClock(app, noon);

    await expect(suggestionFor(app, four, card)).resolves.not.toBeNull();
    await expect(suggestionFor(app, old, card)).resolves.not.toBeNull();

    await expect(lastRowOf(four)).resolves.toMatchObject({ gated: false, receptiveness: about(1 / 6) });
    await expect(lastRowOf(old)).resolves.toMatchObject({ gated: false, receptiveness: 0.5 });
  });
});

describe('what the gate reads', () => {
  it('is the newest ten whose outcome is settled, a tap counting as accepted', async () => {
    const user = await signInUser(app);
    const { noon, card } = await noonWithEvent(12);
    await storeShown(user, eveningBefore(noon, 3), 10);
    await storeShown(user, eveningBefore(noon, 2), 10, SuggestionOutcome.accepted);
    await storeShown(user, new Date(noon.getTime() - 5 * MINUTE_MS), 5);
    fixClock(app, noon);

    await expect(suggestionFor(app, user, card)).resolves.not.toBeNull();

    await expect(lastRowOf(user)).resolves.toMatchObject({ gated: false, receptiveness: about(11 / 12) });
  });

  it('never gates a held-back account, and records its receptiveness all the same', async () => {
    const user = await signInUser(heldBackApp);
    const { noon, card } = await noonWithEvent(18);
    await storeShown(user, eveningBefore(noon, 1), 5);
    fixClock(heldBackApp, noon);

    await expect(suggestionFor(heldBackApp, user, card)).resolves.not.toBeNull();

    await expect(lastRowOf(user)).resolves.toMatchObject({
      holdback: true,
      receptiveness: about(1 / 7),
      gated: false,
    });
  });
});
