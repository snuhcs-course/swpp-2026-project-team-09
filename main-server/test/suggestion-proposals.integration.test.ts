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
import { toPublishedGlobalEventDto } from '../src/global-events/dto/global-event.dto.js';
import { GlobalEvent, Place, PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { startApp } from './start-app.js';
import { AN_ID, korea, storeLedQuest, suggestionFor, twoPlaces, weeksAfter } from './suggestions.js';

// GET /assistant/suggestion with party_for_open_event and repeat_last, whose Proposals pass proposeQuest's checks.
// The app's clock stands on Mondays of 2102, which no other file uses, each test six weeks after the one before.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let clock: MockInstance<() => Date>;
let user: TestUser;
let place301: Place;
let place302: Place;

const FIRST_MONDAY = '2102-01-02';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function day(weeks: number): string {
  return weeksAfter(FIRST_MONDAY, weeks);
}

beforeAll(async () => {
  app = await startApp(inject('settings'));
  clock = vi.spyOn(app.get<Clock>(CLOCK), 'now');
  vi.spyOn(app.get<RandomSource>(SUGGESTION_RANDOM), 'next').mockReturnValue(0.5);
  prisma = connectToDatabase();
  [place301, place302] = await twoPlaces(prisma);
});

beforeEach(async () => {
  user = await signInUser(app);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// A published event of the file's that starts `hours` after the clock and lasts two hours.
function eventIn(weeks: number, hours: number): Promise<GlobalEvent> {
  const startsAt = new Date(korea(day(weeks), '12:00').getTime() + hours * HOUR_MS);
  return storeEvent(prisma, {
    title: '2102 관악 음악회',
    startsAt,
    endsAt: new Date(startsAt.getTime() + 2 * HOUR_MS),
  });
}

function onEvent(event: GlobalEvent): Record<string, string> {
  return { screen: 'events', openCard: `globalEvent:${event.id}` };
}

describe('party_for_open_event', () => {
  it('proposes an open 파티 on the show Board for the open card, starting with the event', async () => {
    // The next day, 2102-01-03, at 18:00.
    const event = await eventIn(0, 30);
    clock.mockReturnValue(korea(day(0), '12:00'));

    await expect(suggestionFor(app, user, onEvent(event))).resolves.toEqual({
      id: AN_ID,
      text: '2102 관악 음악회 같이 갈 파티 만들까요?',
      reason: '열어 본 행사 · 1월 3일 18:00',
      action: {
        type: 'proposal',
        proposal: {
          title: '2102 관악 음악회 같이 가요',
          description: '2102 관악 음악회 같이 갈 사람 모집해요',
          joinPolicy: 'open',
          board: 'show',
          capacity: 3,
          startsAt: '2102-01-03T18:00:00+09:00',
          place: null,
          globalEvent: toPublishedGlobalEventDto(event),
          invitees: [],
        },
      },
    });
  });

  it('suggests nothing for an event that ended, a draft, or no open card', async () => {
    const ended = await eventIn(6, -3);
    const draft = await storeEvent(prisma, { state: 'draft', startsAt: korea(day(6), '20:00') });
    clock.mockReturnValue(korea(day(6), '12:00'));

    await expect(suggestionFor(app, user, onEvent(ended))).resolves.toBeNull();
    await expect(suggestionFor(app, user, onEvent(draft))).resolves.toBeNull();
    await expect(suggestionFor(app, user, { screen: 'events' })).resolves.toBeNull();
  });

  it('never shows a Proposal the shared checks refuse: an event that started has its start in the past', async () => {
    const started = await eventIn(12, -1);
    clock.mockReturnValue(korea(day(12), '12:00'));

    await expect(suggestionFor(app, user, onEvent(started))).resolves.toBeNull();
    await expect(prisma.suggestionImpression.findMany({ where: { userId: user.id } })).resolves.toEqual([
      expect.objectContaining({ template: null, eligible: [], outcome: 'silent' }),
    ]);
  });
});

describe('repeat_last', () => {
  it('repeats two Quests the User led at one Place for lunch in the last two weeks', async () => {
    const monday = korea(day(18), '09:00');
    await storeLedQuest(prisma, user.id, new Date(monday.getTime() - 5 * DAY_MS + 3 * HOUR_MS), place301.id);
    await storeLedQuest(prisma, user.id, new Date(monday.getTime() - 2 * DAY_MS + 3.5 * HOUR_MS), place301.id);
    clock.mockReturnValue(monday);

    await expect(suggestionFor(app, user)).resolves.toEqual({
      id: AN_ID,
      text: `지난번처럼 ${place301.name}에서 점심 어때요?`,
      reason: '최근 2주 2번 · 오늘 12:30',
      action: {
        type: 'proposal',
        proposal: {
          title: `지난번처럼 ${place301.name}에서 점심`,
          description: '학생회관에서 같이 먹어요',
          joinPolicy: 'open',
          board: 'meal',
          capacity: 4,
          startsAt: `${day(18)}T12:30:00+09:00`,
          place: { id: place301.id, name: place301.name },
          globalEvent: null,
          invitees: [],
        },
      },
    });
  });
});

describe('repeat_last, not applying', () => {
  it('suggests nothing for one Quest, two at different Places, or one older than two weeks', async () => {
    const monday = korea(day(24), '09:00');
    await storeLedQuest(prisma, user.id, new Date(monday.getTime() - 15 * DAY_MS + 3 * HOUR_MS), place301.id);
    await storeLedQuest(prisma, user.id, new Date(monday.getTime() - 3 * DAY_MS + 3 * HOUR_MS), place301.id);
    await storeLedQuest(prisma, user.id, new Date(monday.getTime() - 2 * DAY_MS + 3 * HOUR_MS), place302.id);
    clock.mockReturnValue(monday);

    await expect(suggestionFor(app, user)).resolves.toBeNull();
  });

  it('does not count a Quest made from a suggestion as a repeat', async () => {
    const monday = korea(day(30), '09:00');
    await storeLedQuest(prisma, user.id, new Date(monday.getTime() - 3 * DAY_MS + 3 * HOUR_MS), place301.id);
    const fromSuggestion = await storeLedQuest(
      prisma,
      user.id,
      new Date(monday.getTime() - 2 * DAY_MS + 3 * HOUR_MS),
      place301.id,
    );
    const shownAt = new Date(monday.getTime() - 2 * DAY_MS);
    await prisma.suggestionImpression.create({
      data: {
        userId: user.id,
        template: 'repeat_last',
        eligible: ['repeat_last'],
        bucket: 'morning',
        propensity: 1,
        holdback: false,
        shownAt,
        outcome: 'confirmed',
        outcomeAt: shownAt,
        questId: fromSuggestion,
      },
    });
    clock.mockReturnValue(monday);

    await expect(suggestionFor(app, user)).resolves.toBeNull();
  });
});
