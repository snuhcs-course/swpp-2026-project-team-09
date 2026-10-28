/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { type MockInstance, inject } from 'vitest';
import { type RandomSource, SUGGESTION_RANDOM } from '../src/assistant/suggestions/random.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { startApp } from './start-app.js';
import { korea, postOutcome, suggestionFor, weeksAfter } from './suggestions.js';

// POST /assistant/suggestions/:id/outcome, and the impressions going with the account. The app's clock stands on
// Mondays from January 2104, which no other file uses, each suggestion six weeks after the one before, so that the
// impressions of one never lower the acceptance of the next.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let clock: MockInstance<() => Date>;
let user: TestUser;

const HOUR_MS = 60 * 60 * 1000;
let weeks = 0;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  clock = vi.spyOn(app.get<Clock>(CLOCK), 'now');
  vi.spyOn(app.get<RandomSource>(SUGGESTION_RANDOM), 'next').mockReturnValue(0.5);
  prisma = connectToDatabase();
});

beforeEach(async () => {
  user = await signInUser(app);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// Sets the clock to a Monday noon six weeks after the last, and answers it.
function nextMonday(): Date {
  weeks += 6;
  const now = korea(weeksAfter('2104-01-07', weeks), '12:00');
  clock.mockReturnValue(now);
  return now;
}

// Moves the clock `seconds` on, and answers it.
function later(from: Date, seconds: number): Date {
  const at = new Date(from.getTime() + seconds * 1000);
  clock.mockReturnValue(at);
  return at;
}

// The id of a suggestion shown to the User on the next Monday, as a party for an event the User has open.
async function shownSuggestion(): Promise<{ id: string; shownAt: Date }> {
  const shownAt = nextMonday();
  const startsAt = new Date(shownAt.getTime() + 55 * HOUR_MS);
  const event = await storeEvent(prisma, {
    title: '2104 신년 음악회',
    startsAt,
    endsAt: new Date(startsAt.getTime() + 2 * HOUR_MS),
  });
  const suggestion = await suggestionFor(app, user, { screen: 'events', openCard: `globalEvent:${event.id}` });
  if (suggestion === null) {
    throw new Error('No suggestion was shown');
  }
  return { id: suggestion.id, shownAt };
}

function stored(id: string): Promise<object | null> {
  return prisma.suggestionImpression.findUnique({
    where: { id },
    select: { outcome: true, outcomeAt: true, questId: true },
  });
}

describe('POST /assistant/suggestions/:id/outcome', () => {
  it('records a tap, then the Quest its Proposal made, each with the time', async () => {
    const { id, shownAt } = await shownSuggestion();
    const questId = randomUUID();

    const tappedAt = later(shownAt, 5);
    expect((await postOutcome(app, user, id, { outcome: 'accepted' })).status).toBe(204);
    await expect(stored(id)).resolves.toEqual({ outcome: 'accepted', outcomeAt: tappedAt, questId: null });
    const madeAt = later(shownAt, 60);
    expect((await postOutcome(app, user, id, { outcome: 'confirmed', questId })).status).toBe(204);
    await expect(stored(id)).resolves.toEqual({ outcome: 'confirmed', outcomeAt: madeAt, questId });
  });

  it('changes nothing on the same outcome again, and refuses one that would replace a later one', async () => {
    const { id } = await shownSuggestion();
    await postOutcome(app, user, id, { outcome: 'dismissed' });
    const dismissed = await stored(id);

    expect((await postOutcome(app, user, id, { outcome: 'dismissed' })).status).toBe(204);
    await expect(stored(id)).resolves.toEqual(dismissed);
    await expect(postOutcome(app, user, id, { outcome: 'accepted' })).resolves.toMatchObject({
      status: 409,
      body: { code: 'SUGGESTION_OUTCOME_SETTLED' },
    });
  });

  it("answers 404 for another User's suggestion and for none, and changes nothing", async () => {
    const { id } = await shownSuggestion();
    const stranger = await signInUser(app);
    const notFound = { status: 404, body: { code: 'SUGGESTION_NOT_FOUND' } };

    await expect(postOutcome(app, stranger, id, { outcome: 'accepted' })).resolves.toMatchObject(notFound);
    await expect(postOutcome(app, user, randomUUID(), { outcome: 'accepted' })).resolves.toMatchObject(notFound);
    await expect(stored(id)).resolves.toMatchObject({ outcome: 'shown' });
  });
});

describe('POST /assistant/suggestions/:id/outcome, refusing the body', () => {
  it.each([
    ['confirmed without the Quest', { outcome: 'confirmed' }],
    ['accepted with a Quest', { outcome: 'accepted', questId: randomUUID() }],
    ['ignored, which is never sent', { outcome: 'ignored' }],
    ['confirmed with a Quest that is no id', { outcome: 'confirmed', questId: '42' }],
  ])('answers 400 for %s', async (_as, body) => {
    const { id } = await shownSuggestion();

    await expect(postOutcome(app, user, id, body)).resolves.toMatchObject({ status: 400 });
  });
});

describe('the impressions of an account', () => {
  it('go with the account', async () => {
    await shownSuggestion();
    await prisma.refreshToken.deleteMany({ where: { session: { userId: user.id } } });
    await prisma.session.deleteMany({ where: { userId: user.id } });

    await prisma.user.delete({ where: { id: user.id } });

    await expect(prisma.suggestionImpression.count({ where: { userId: user.id } })).resolves.toBe(0);
  });
});
