/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import { inject, type ProvidedContext } from 'vitest';
import { suggestionCurves } from '../eval/replay/suggestions.ts';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { connect, type SeededDatabase, seededDatabase } from './containers.js';

// The suggestion curves of the replay (P07 ticket 05) on a seeded database of their own, whose impressions are this
// file's alone: the rows read by the days asked, the unsettled left out, and the openings per arm with the gated ones.

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();

let database: SeededDatabase<ProvidedContext['settings']>;
let prisma: PrismaClient;

beforeAll(async () => {
  database = await seededDatabase(inject('settings'));
  prisma = connect(database.url);
});

afterAll(async () => {
  await prisma.$disconnect();
  await database.drop();
});

async function account(): Promise<string> {
  const { id } = await prisma.user.create({
    data: { googleSubject: randomUUID(), email: 'replay@example.com', friendId: randomUUID() },
  });
  return id;
}

// The User's lunch suggestions: at `shownAt` one accepted, one ignored, one silent then asked for in the chat two
// minutes on (a missed need), one silent, and one the gate made silent; one 30 days ago and one a minute ago, outside
// the days asked.
async function storeOpenings(userId: string, shownAt: Date): Promise<void> {
  const base = {
    userId,
    template: 'lunch_with_free_friend',
    eligible: ['lunch_with_free_friend'],
    bucket: 'midday',
    propensity: 0.9,
    holdback: false,
    receptiveness: 0.5,
    gated: false,
  };
  const silent = { ...base, template: null, propensity: null, outcome: 'silent' as const, shownAt };
  await prisma.suggestionImpression.createMany({
    data: [
      { ...base, shownAt, outcome: 'accepted', outcomeAt: new Date(shownAt.getTime() + 60_000) },
      { ...base, shownAt },
      { ...base, shownAt: new Date(NOW - 30 * DAY_MS) },
      { ...base, shownAt: new Date(NOW - 60_000) },
      { ...silent, typedTemplate: 'lunch_with_free_friend', typedAt: new Date(shownAt.getTime() + 120_000) },
      silent,
      { ...silent, receptiveness: 1 / 7, gated: true },
    ],
  });
}

describe('The suggestion curves', () => {
  it('read the impressions shown on the days asked whose outcome is settled, the openings per arm', async () => {
    await storeOpenings(await account(), new Date(NOW - 5 * DAY_MS));

    const curves = await suggestionCurves(
      prisma,
      { from: new Date(NOW - 7 * DAY_MS), until: new Date(NOW + DAY_MS), finalFrom: null },
      new Date(NOW),
    );

    expect(curves.weeks.reduce((total, { shown }) => total + shown, 0)).toBe(2);
    expect(curves.weighted).toEqual([
      { slice: 'all', template: 'lunch_with_free_friend', holdback: false, shown: 2, acceptance: 0.5 },
    ]);
    expect(curves.openings).toMatchObject([
      { slice: 'all', holdback: false, openings: 5, silent: 3, gated: 1, silentThenTyped: 1, accepted: { k: 1, n: 5 } },
    ]);
    expect(curves.needs).toHaveLength(1);
    expect(curves.needs[0]).toMatchObject({
      template: 'lunch_with_free_friend',
      shown: 2,
      accepted: { k: 1, n: 2 },
      falseAlarm: { k: 1, n: 2 },
      eligibleNotShown: 3,
      missedNeed: { k: 1, n: 3 },
      recall: { k: 1, n: 2 },
    });
  });
});
