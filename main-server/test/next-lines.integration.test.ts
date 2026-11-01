/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { type MockInstance, inject } from 'vitest';
import { z } from 'zod';
import { type RandomSource, SUGGESTION_RANDOM } from '../src/assistant/suggestions/random.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { AN_ID, korea, postOutcome, suggestionFor, weeksAfter } from './suggestions.js';
import { refuseKakao } from './walking-route.js';

// The next line of an answer (P07 ticket 09), through POST /assistant/messages with the scripted model in the model's
// place. The apps' clocks stand on Mondays of 2108, which no other file uses, each test six weeks after the one before,
// so that a test's impressions fall outside another's window of acceptance.

let app: INestApplication<Server>;
let heldBackApp: INestApplication<Server>;
let prisma: PrismaClient;
let clock: MockInstance<() => Date>;
let user: TestUser;
const model = new ScriptedModel();

const FIRST_MONDAY = '2108-01-02';
const HOUR_MS = 60 * 60 * 1000;

function monday(weeks: number): string {
  return weeksAfter(FIRST_MONDAY, weeks);
}

function start(settings: Parameters<typeof startApp>[0]): ReturnType<typeof startApp> {
  return startApp(settings, [], refuseKakao, refuseMatchServer, model.model);
}

beforeAll(async () => {
  app = await start(inject('settings'));
  heldBackApp = await start({ ...inject('settings'), ASSISTANT_SUGGESTION_HOLDBACK_PERCENT: '100' });
  clock = vi.spyOn(app.get<Clock>(CLOCK), 'now');
  for (const started of [app, heldBackApp]) {
    vi.spyOn(started.get<RandomSource>(SUGGESTION_RANDOM), 'next').mockReturnValue(0.5);
  }
  prisma = connectToDatabase();
});

beforeEach(async () => {
  user = await signInUser(app);
});

afterAll(async () => {
  await prisma.$disconnect();
  await Promise.all([app.close(), heldBackApp.close()]);
});

const replySchema = z
  .object({ nextLine: z.object({ id: z.string(), text: z.string(), chosen: z.null() }).nullable() })
  .loose();

// The model proposes a lunch on the day after the Monday of week `weeks`, and the reply's body comes back.
async function proposeLunch(weeks: number, on = app, asker = user): Promise<z.infer<typeof replySchema>> {
  const startsAt = new Date(korea(monday(weeks), '12:00').getTime() + 24 * HOUR_MS).toISOString();
  model.script(
    {
      tool: 'proposeQuest',
      input: { title: '점심', description: '같이 먹어요', joinPolicy: 'open', board: 'meal', capacity: 4, startsAt },
    },
    { text: '만들기를 누르면 파티가 만들어져요.' },
  );
  const response = await postAssistantMessages(on, asker.accessToken, ask('내일 점심 같이 먹을 사람 모집해줘'));
  expect(response.status).toBe(200);
  return replySchema.parse(response.body);
}

function rowsOf(userId: string): Promise<object[]> {
  return prisma.suggestionImpression.findMany({
    where: { userId, moment: 'answer' },
    orderBy: { shownAt: 'asc' },
    select: { template: true, eligible: true, propensity: true, outcome: true, gated: true, receptiveness: true },
  });
}

// Next lines shown to the User at the time given and left there.
async function storeIgnored(userId: string, shownAt: Date, count: number): Promise<void> {
  await prisma.suggestionImpression.createMany({
    data: Array.from({ length: count }, () => ({
      userId,
      moment: 'answer' as const,
      template: 'change_shown_proposal',
      eligible: ['change_shown_proposal'],
      bucket: 'morning',
      propensity: 1,
      holdback: false,
      receptiveness: 0.5,
      gated: false,
      shownAt,
    })),
  });
}

const LATER = '시간을 1시간 뒤로 미뤄줘';

describe('An answer that leaves a next line', () => {
  it('carries it, and writes one row of the moment `answer`', async () => {
    clock.mockReturnValue(korea(monday(0), '12:00'));

    const body = await proposeLunch(0);

    expect(body.nextLine).toEqual({ id: AN_ID, text: LATER, chosen: null });
    await expect(rowsOf(user.id)).resolves.toEqual([
      {
        template: 'change_shown_proposal',
        eligible: ['change_shown_proposal'],
        propensity: 1,
        outcome: 'shown',
        gated: false,
        receptiveness: 0.5,
      },
    ]);
  });

  it('takes an outcome as a suggestion does', async () => {
    clock.mockReturnValue(korea(monday(6), '12:00'));
    const { nextLine } = await proposeLunch(6);

    expect((await postOutcome(app, user, nextLine?.id ?? '', { outcome: 'accepted' })).status).toBe(204);

    await expect(rowsOf(user.id)).resolves.toMatchObject([{ outcome: 'accepted' }]);
  });
});

describe('An answer that leaves nothing', () => {
  it('carries none and writes no row', async () => {
    clock.mockReturnValue(korea(monday(12), '12:00'));
    model.script({ text: '안녕하세요!' });

    const response = await postAssistantMessages(app, user.accessToken, ask('안녕'));

    expect(response.body).toMatchObject({ nextLine: null });
    await expect(rowsOf(user.id)).resolves.toEqual([]);
  });
});

describe('The gate of next lines', () => {
  it('silences them after ten in a row not taken within a day, and says so', async () => {
    const noon = korea(monday(18), '12:00');
    clock.mockReturnValue(noon);
    await storeIgnored(user.id, new Date(noon.getTime() - HOUR_MS), 10);

    const body = await proposeLunch(18);

    expect(body.nextLine).toBeNull();
    const rows = await rowsOf(user.id);
    expect(rows.at(-1)).toMatchObject({ template: null, outcome: 'silent', gated: true, propensity: null });
  });

  it('lets them show after nine, and after ten over a day old', async () => {
    const noon = korea(monday(24), '12:00');
    clock.mockReturnValue(noon);
    const old = await signInUser(app);
    await storeIgnored(user.id, new Date(noon.getTime() - HOUR_MS), 9);
    await storeIgnored(old.id, new Date(noon.getTime() - 25 * HOUR_MS), 10);

    expect((await proposeLunch(24)).nextLine).toMatchObject({ text: LATER });
    expect((await proposeLunch(24, app, old)).nextLine).toMatchObject({ text: LATER });
  });

  it('never holds back a held-back account', async () => {
    const noon = korea(monday(30), '12:00');
    vi.spyOn(heldBackApp.get<Clock>(CLOCK), 'now').mockReturnValue(noon);
    const heldBack = await signInUser(heldBackApp);
    await storeIgnored(heldBack.id, new Date(noon.getTime() - HOUR_MS), 10);

    expect((await proposeLunch(30, heldBackApp, heldBack)).nextLine).toMatchObject({ text: LATER });
  });

  it('leaves the chat-open gate as it is', async () => {
    const noon = korea(monday(36), '12:00');
    clock.mockReturnValue(noon);
    await storeIgnored(user.id, new Date(noon.getTime() - HOUR_MS), 10);
    const startsAt = new Date(noon.getTime() + 48 * HOUR_MS);
    const event = await storeEvent(prisma, {
      title: '2108 학술제',
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR_MS),
    });

    const suggestion = await suggestionFor(app, user, { screen: 'events', openCard: `globalEvent:${event.id}` });

    expect(suggestion).not.toBeNull();
  });
});

describe('A dismissal', () => {
  it('holds next lines back for its cooldown', async () => {
    const noon = korea(monday(42), '12:00');
    clock.mockReturnValue(noon);
    const startsAt = new Date(noon.getTime() + 48 * HOUR_MS);
    const event = await storeEvent(prisma, {
      title: '2108 음악회',
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR_MS),
    });
    const shown = await suggestionFor(app, user, { screen: 'events', openCard: `globalEvent:${event.id}` });
    expect((await postOutcome(app, user, shown?.id ?? '', { outcome: 'dismissed' })).status).toBe(204);

    expect((await proposeLunch(42)).nextLine).toBeNull();
  });
});

describe('A next line about an event, sent back unchanged', () => {
  it('lets proposeQuest take the event with no resolver, as a chip does', async () => {
    const noon = korea(monday(48), '12:00');
    clock.mockReturnValue(noon);
    const startsAt = new Date(noon.getTime() + 48 * HOUR_MS);
    const event = await storeEvent(prisma, {
      title: '2108 전시',
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR_MS),
    });
    model.script(
      {
        tool: 'proposeQuest',
        input: {
          title: '같이 가요',
          description: '같이 갈 사람 모집해요',
          joinPolicy: 'open',
          board: 'show',
          capacity: 3,
          globalEventId: event.id,
        },
      },
      { text: '만들기를 누르면 파티가 만들어져요.' },
    );

    const response = await postAssistantMessages(app, user.accessToken, [
      {
        role: 'user',
        text: '이 행사 같이 갈 사람 모집해줘',
        chosen: { kind: 'globalEvent', id: event.id, words: '이 행사' },
      },
    ]);

    expect(response.body).toMatchObject({ proposal: { globalEvent: { id: event.id } } });
  });
});
