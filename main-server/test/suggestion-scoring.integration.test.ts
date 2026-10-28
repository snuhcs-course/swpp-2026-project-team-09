/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { type MockInstance, inject } from 'vitest';
import { type RandomSource, SUGGESTION_RANDOM } from '../src/assistant/suggestions/random.js';
import { GlobalEvent, Place, PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { startApp } from './start-app.js';
import {
  korea,
  mondayClass,
  postOutcome,
  storeImpressions,
  storeLedQuest,
  suggestionFor,
  twoPlaces,
  weeksAfter,
} from './suggestions.js';

// The score's thresholds, the fatigue after dismissals and the exposure draw, through GET /assistant/suggestion. The
// app's clock stands on Mondays of 2103, which no other file uses, each test six weeks after the one before, and the
// acceptance of a template is set by storing other Users' impressions in the test's window.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let clock: MockInstance<() => Date>;
let random: MockInstance<() => number>;
let user: TestUser;
let other: TestUser;
let place301: Place;

const FIRST_MONDAY = '2103-01-01';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function day(weeks: number): string {
  return weeksAfter(FIRST_MONDAY, weeks);
}

beforeAll(async () => {
  app = await startApp(inject('settings'));
  clock = vi.spyOn(app.get<Clock>(CLOCK), 'now');
  random = vi.spyOn(app.get<RandomSource>(SUGGESTION_RANDOM), 'next').mockReturnValue(0.5);
  prisma = connectToDatabase();
  [place301] = await twoPlaces(prisma);
  other = await signInUser(app);
});

beforeEach(async () => {
  user = await signInUser(app);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// A published event two days after the Monday, which the User has open.
async function openEvent(weeks: number): Promise<Record<string, string>> {
  const startsAt = korea(day(weeks), '19:00');
  const event: GlobalEvent = await storeEvent(prisma, {
    title: '2103 학술 강연',
    startsAt: new Date(startsAt.getTime() + 2 * DAY_MS),
    endsAt: new Date(startsAt.getTime() + 2 * DAY_MS + 2 * HOUR_MS),
  });
  return { screen: 'main', openCard: `globalEvent:${event.id}` };
}

function impressionOf(
  id: string | undefined,
): Promise<{ template: string | null; eligible: string[]; propensity: number | null } | null> {
  return prisma.suggestionImpression.findUnique({
    where: { id },
    select: { template: true, eligible: true, propensity: true },
  });
}

describe('the thresholds', () => {
  it('shows a score of 0.25 and not one below', async () => {
    const card = await openEvent(0);
    await mondayClass(app, user, '13:00', '14:15', place301.id);
    const shownAt = korea(day(0), '11:00');
    await storeImpressions(prisma, other.id, 'party_for_open_event', 'midday', shownAt, { shown: 2, accepted: 0 });
    await storeImpressions(prisma, other.id, 'route_to_next_class', 'midday', shownAt, { shown: 2, accepted: 0 });
    clock.mockReturnValue(korea(day(0), '12:10'));

    const suggestion = await suggestionFor(app, user, card);

    expect(suggestion?.action.type).toBe('proposal');
    await expect(impressionOf(suggestion?.id)).resolves.toMatchObject({
      template: 'party_for_open_event',
      eligible: ['party_for_open_event', 'route_to_next_class'],
    });
  });

  it('asks 0.35 of the template that names a Friend: at 0.3 the event shows, not the lunch', async () => {
    const card = await openEvent(6);
    const minsu = await signInUser(app, { name: '민수', department: '컴퓨터공학부' });
    await befriend(app, user, minsu);
    await mondayClass(app, minsu, '09:00', '11:00');
    const shownAt = korea(day(6), '11:00');
    await storeImpressions(prisma, other.id, 'lunch_with_free_friend', 'midday', shownAt, { shown: 8, accepted: 2 });
    await storeImpressions(prisma, other.id, 'party_for_open_event', 'midday', shownAt, { shown: 8, accepted: 2 });
    clock.mockReturnValue(korea(day(6), '12:00'));

    const suggestion = await suggestionFor(app, user, card);

    await expect(impressionOf(suggestion?.id)).resolves.toMatchObject({
      template: 'party_for_open_event',
      eligible: ['lunch_with_free_friend', 'party_for_open_event'],
    });
  });
});

// The Monday of the fatigue's test at `time`.
function fatigueDay(time: string): Date {
  return korea(day(12), time);
}

// Whether a suggestion shows at the time, dismissing it when `dismiss` is set.
async function showsAt(card: Record<string, string>, at: Date, dismiss = false): Promise<boolean> {
  clock.mockReturnValue(at);
  const suggestion = await suggestionFor(app, user, card);
  if (dismiss && suggestion !== null) {
    expect((await postOutcome(app, user, suggestion.id, { outcome: 'dismissed' })).status).toBe(204);
  }
  return suggestion !== null;
}

describe('the fatigue', () => {
  // Each check falls in another bucket, so that the dismissals before do not lower its acceptance.
  it('holds back 2 hours after a dismissal, 6 after the second and the rest of the day after the third', async () => {
    const card = await openEvent(12);

    expect(await showsAt(card, fatigueDay('09:00'), true)).toBe(true);
    expect(await showsAt(card, fatigueDay('10:59'))).toBe(false);
    expect(await showsAt(card, fatigueDay('11:00'), true)).toBe(true);
    expect(await showsAt(card, fatigueDay('16:59'))).toBe(false);
    expect(await showsAt(card, fatigueDay('17:00'), true)).toBe(true);
    expect(await showsAt(card, fatigueDay('23:59'))).toBe(false);
    expect(await showsAt(card, new Date(fatigueDay('06:00').getTime() + DAY_MS))).toBe(true);
  });
});

describe('the exposure', () => {
  it('shows another template above its threshold one time in ten, and writes the propensity it had', async () => {
    const card = await openEvent(18);
    const monday = korea(day(18), '09:00');
    await storeLedQuest(prisma, user.id, new Date(monday.getTime() - 3 * DAY_MS + 3 * HOUR_MS), place301.id);
    await storeLedQuest(prisma, user.id, new Date(monday.getTime() - 2 * DAY_MS + 3 * HOUR_MS), place301.id);
    clock.mockReturnValue(monday);

    random.mockReturnValueOnce(0.05).mockReturnValueOnce(0.9);
    const explored = await suggestionFor(app, user, card);
    const top = await suggestionFor(app, user, card);

    const eligible = ['repeat_last', 'party_for_open_event'];
    const [shownByChance, shownOnTop] = await Promise.all([impressionOf(explored?.id), impressionOf(top?.id)]);
    expect(shownByChance).toMatchObject({ template: 'party_for_open_event', eligible });
    expect(shownByChance?.propensity).toBeCloseTo(0.1 / 2);
    expect(shownOnTop).toMatchObject({ template: 'repeat_last', eligible });
    expect(shownOnTop?.propensity).toBeCloseTo(0.9 + 0.1 / 2);
  });
});
