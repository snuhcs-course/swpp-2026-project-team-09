/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { type MockInstance, inject } from 'vitest';
import { type RandomSource, SUGGESTION_RANDOM } from '../src/assistant/suggestions/random.js';
import { GlobalEvent, PrismaClient, type SuggestionImpression } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { korea, postOutcome, suggestionFor, weeksAfter } from './suggestions.js';
import { refuseKakao } from './walking-route.js';

// The rows GET /assistant/suggestion writes when it shows nothing, and the Proposal the User asks for in the chat
// matched to them (research note 10 §1: ProactiveBench's missed needs and false alarms). The app's clock stands on
// Mondays of 2106, which no other file uses, each test six weeks after the one before.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let clock: MockInstance<() => Date>;
let user: TestUser;
const model = new ScriptedModel();

const FIRST_MONDAY = '2106-01-04';
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
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

// A published event two days after the Monday of week `weeks`, which the User has open.
async function openEvent(weeks: number): Promise<{ event: GlobalEvent; card: Record<string, string> }> {
  const startsAt = new Date(korea(weeksAfter(FIRST_MONDAY, weeks), '18:00').getTime() + 2 * DAY_MS);
  const event = await storeEvent(prisma, {
    title: `2106 학술제 ${weeks}주`,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 2 * HOUR_MS),
  });
  return { event, card: { screen: 'events', openCard: `globalEvent:${event.id}` } };
}

// The User asks for a 파티 for the event: the model resolves it and proposes.
async function askForParty(event: GlobalEvent): Promise<void> {
  model.script(
    { tool: 'resolveGlobalEvent', input: { words: event.title } },
    {
      tool: 'proposeQuest',
      input: {
        title: '학술제 같이 가요',
        description: '학술제 같이 갈 사람 모집해요',
        joinPolicy: 'open',
        board: 'show',
        capacity: 4,
        globalEventId: event.id,
      },
    },
    { text: '만들기를 누르면 파티가 만들어져요.' },
  );
  const response = await postAssistantMessages(app, user.accessToken, ask(`${event.title} 같이 갈 파티 만들어줘`));
  expect(response.status).toBe(200);
}

type Row = Pick<
  SuggestionImpression,
  'template' | 'eligible' | 'candidates' | 'propensity' | 'outcome' | 'typedTemplate' | 'typedAt'
>;

function rowsOf(): Promise<Row[]> {
  return prisma.suggestionImpression.findMany({
    where: { userId: user.id },
    orderBy: { shownAt: 'asc' },
    select: {
      template: true,
      eligible: true,
      candidates: true,
      propensity: true,
      outcome: true,
      typedTemplate: true,
      typedAt: true,
    },
  });
}

describe('an opening that shows nothing', () => {
  it('writes a silent row with what was eligible, during a cooldown too', async () => {
    const { event, card } = await openEvent(0);
    clock.mockReturnValue(korea(FIRST_MONDAY, '12:00'));

    await expect(suggestionFor(app, user)).resolves.toBeNull();
    const shown = await suggestionFor(app, user, card);
    expect((await postOutcome(app, user, shown?.id ?? '', { outcome: 'dismissed' })).status).toBe(204);
    await expect(suggestionFor(app, user, card)).resolves.toBeNull();

    const candidates = [`party_for_open_event globalEvent:${event.id}`];
    await expect(rowsOf()).resolves.toEqual([
      expect.objectContaining({ template: null, eligible: [], candidates: [], propensity: null, outcome: 'silent' }),
      expect.objectContaining({ template: 'party_for_open_event', propensity: 1, outcome: 'dismissed', candidates }),
      expect.objectContaining({ template: null, eligible: ['party_for_open_event'], candidates, outcome: 'silent' }),
    ]);
  });
});

describe('a Proposal the User asks for in the chat', () => {
  it('marks the eligible template that would have proposed it on the silent row of the last 10 minutes', async () => {
    const { event, card } = await openEvent(6);
    const opened = korea(weeksAfter(FIRST_MONDAY, 6), '12:00');
    clock.mockReturnValue(opened);
    const shown = await suggestionFor(app, user, card);
    await postOutcome(app, user, shown?.id ?? '', { outcome: 'dismissed' });
    await suggestionFor(app, user, card);
    const typedAt = new Date(opened.getTime() + 5 * MINUTE_MS);
    clock.mockReturnValue(typedAt);

    await askForParty(event);

    await expect(rowsOf()).resolves.toEqual([
      expect.objectContaining({ outcome: 'dismissed', typedTemplate: null, typedAt: null }),
      expect.objectContaining({ outcome: 'silent', typedTemplate: 'party_for_open_event', typedAt }),
    ]);
  });

  it('marks the template shown when the User typed what it suggested, and nothing later or for other ids', async () => {
    const { event, card } = await openEvent(12);
    const opened = korea(weeksAfter(FIRST_MONDAY, 12), '12:00');
    clock.mockReturnValue(opened);
    await suggestionFor(app, user, card);
    const typedAt = new Date(opened.getTime() + 9 * MINUTE_MS);
    clock.mockReturnValue(typedAt);
    await askForParty(event);
    await expect(rowsOf()).resolves.toEqual([
      expect.objectContaining({ template: 'party_for_open_event', typedTemplate: 'party_for_open_event', typedAt }),
    ]);

    clock.mockReturnValue(new Date(opened.getTime() + 20 * MINUTE_MS));
    await suggestionFor(app, user, card);
    clock.mockReturnValue(new Date(opened.getTime() + 31 * MINUTE_MS));
    await askForParty(event);
    const { event: other } = await openEvent(13);
    clock.mockReturnValue(new Date(opened.getTime() + 40 * MINUTE_MS));
    await suggestionFor(app, user, card);
    await askForParty(other);

    const rows = await rowsOf();
    expect(rows.slice(1).map(({ typedTemplate }) => typedTemplate)).toEqual([null, null]);
  });
});
