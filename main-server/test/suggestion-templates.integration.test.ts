/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { type MockInstance, inject } from 'vitest';
import { type RandomSource, SUGGESTION_RANDOM } from '../src/assistant/suggestions/random.js';
import { Place, PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { expectStatus, setFriendSharing } from './location-sharing.js';
import { connectToDatabase } from './quests.js';
import { startApp } from './start-app.js';
import { AN_ID, getSuggestion, korea, mondayClass, suggestionFor, twoPlaces, weeksAfter } from './suggestions.js';

// GET /assistant/suggestion with lunch_with_free_friend and route_to_next_class, read from seeded timetables and
// Friends. The app's clock stands on Mondays of 2101, which no other file uses, each test six weeks after the one
// before, so that the impressions of one never reach another's acceptance.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let clock: MockInstance<() => Date>;
let place301: Place;

const FIRST_MONDAY = '2101-01-03';

function at(weeks: number, time: string): Date {
  return korea(weeksAfter(FIRST_MONDAY, weeks), time);
}

function named(name: string): Promise<TestUser> {
  return signInUser(app, { name, department: '컴퓨터공학부' });
}

beforeAll(async () => {
  app = await startApp(inject('settings'));
  clock = vi.spyOn(app.get<Clock>(CLOCK), 'now');
  vi.spyOn(app.get<RandomSource>(SUGGESTION_RANDOM), 'next').mockReturnValue(0.5);
  prisma = connectToDatabase();
  [place301] = await twoPlaces(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// A User whose class ends at 11:30 and their Friend 민수, whose class ends at 11:00, both on Monday.
async function lunchPair(): Promise<[TestUser, TestUser]> {
  const [user, minsu] = await Promise.all([named('홍길동'), named('민수')]);
  await befriend(app, user, minsu);
  await Promise.all([mondayClass(app, user, '09:30', '11:30'), mondayClass(app, minsu, '09:00', '11:00')]);
  return [user, minsu];
}

describe('lunch_with_free_friend', () => {
  it('suggests lunch with a free Friend as a closed Proposal, and logs the impression', async () => {
    const [user, minsu] = await lunchPair();
    clock.mockReturnValue(at(0, '11:40'));

    const suggestion = await suggestionFor(app, user);

    expect(suggestion).toEqual({
      id: AN_ID,
      text: '민수랑 점심 어때요?',
      reason: '공강 시작 · 민수도 공강',
      action: {
        type: 'proposal',
        proposal: {
          title: '민수랑 점심',
          description: '',
          joinPolicy: 'closed',
          board: null,
          capacity: 2,
          startsAt: `${weeksAfter(FIRST_MONDAY, 0)}T12:00:00+09:00`,
          place: null,
          globalEvent: null,
          invitees: [{ id: minsu.id, name: '민수' }],
        },
      },
    });
    await expect(prisma.suggestionImpression.findUnique({ where: { id: suggestion?.id } })).resolves.toMatchObject({
      userId: user.id,
      template: 'lunch_with_free_friend',
      eligible: ['lunch_with_free_friend'],
      bucket: 'midday',
      propensity: 1,
      holdback: false,
      shownAt: at(0, '11:40'),
      outcome: 'shown',
      outcomeAt: null,
      questId: null,
    });
  });
});

describe('lunch_with_free_friend, not applying', () => {
  it('suggests nothing when the Friend turned sharing off on the friendship', async () => {
    const [user, minsu] = await lunchPair();
    await expectStatus(setFriendSharing(app, minsu, user.id, false), 204);
    clock.mockReturnValue(at(6, '12:00'));

    await expect(suggestionFor(app, user)).resolves.toBeNull();
  });

  it('suggests nothing while the Friend is in class, or before 11:00', async () => {
    const [user, minsu] = await lunchPair();
    await mondayClass(app, minsu, '11:45', '13:00');

    clock.mockReturnValue(at(12, '12:00'));
    await expect(suggestionFor(app, user)).resolves.toBeNull();
    clock.mockReturnValue(at(12, '10:59'));
    await expect(suggestionFor(app, user)).resolves.toBeNull();
  });
});

describe('route_to_next_class', () => {
  it("routes to the next class's Place within the hour on the main screen", async () => {
    const user = await named('홍길동');
    await mondayClass(app, user, '13:00', '14:15', place301.id);
    clock.mockReturnValue(at(18, '12:10'));

    await expect(suggestionFor(app, user)).resolves.toEqual({
      id: AN_ID,
      text: `${place301.name}까지 길 안내할까요?`,
      reason: '자료구조 13:00 시작',
      action: { type: 'route', placeId: place301.id, name: place301.name },
    });
  });

  it('suggests no route from another screen, or when the next class is over an hour away', async () => {
    const user = await named('홍길동');
    await mondayClass(app, user, '13:00', '14:15', place301.id);

    clock.mockReturnValue(at(24, '12:10'));
    await expect(suggestionFor(app, user, { screen: 'events' })).resolves.toBeNull();
    clock.mockReturnValue(at(24, '11:59'));
    await expect(suggestionFor(app, user)).resolves.toBeNull();
  });
});

describe('GET /assistant/suggestion, refusing the query', () => {
  it.each([
    ['without a screen', {}],
    ['with another screen', { screen: 'map' }],
    ['with a card of another kind', { screen: 'events', openCard: `quest:${crypto.randomUUID()}` }],
    ['with an event id that is no id', { screen: 'events', openCard: 'globalEvent:42' }],
  ])('answers 400 %s', async (_as, query) => {
    const user = await named('홍길동');

    await expect(getSuggestion(app, user, query)).resolves.toMatchObject({ status: 400 });
  });
});
