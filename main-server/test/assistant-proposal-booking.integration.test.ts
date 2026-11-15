/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { connectToDatabase } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';
import { refuseMatchServer } from './match-server.js';

// The booking page of a Proposal's Place (seed/facility-booking.json), which proposeQuest fills and the model is not
// told of, with the scripted model in the model's place. assistant-proposals.integration.test.ts holds the rest of
// proposeQuest; this file is apart only for its length. The app's clock stands at a morning of 2097, which no other
// file uses.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let user: TestUser;
const model = new ScriptedModel();

// 2097-05-07 09:00 in Korea.
const NOW = new Date('2097-05-07T00:00:00Z');

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
  prisma = connectToDatabase();
  user = await signInUser(app);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// A complete Open Proposal on the hobby Board, for the next day.
const GAME = {
  title: '2097 같이 운동해요',
  description: '내일 같이 운동할 사람 모집해요',
  joinPolicy: 'open',
  board: 'hobby',
  capacity: 4,
  startsAt: '2097-05-08T12:00:00+09:00',
};

const STUDY_ROOMS = { label: '예약하샤 스터디룸 예약', url: 'https://ssims.snu.ac.kr/index.do' };

async function placeIdOf(where: { number: string } | { name: string; number: null }): Promise<string> {
  return (await prisma.place.findFirstOrThrow({ where })).id;
}

// The model resolves `words`, then proposes GAME at the Place `placeId`; the Place of the reply's Proposal.
async function proposeAt(words: string, placeId: string): Promise<unknown> {
  model.script(
    { tool: 'resolvePlace', input: { words } },
    { tool: 'proposeQuest', input: { ...GAME, placeId } },
    { text: '만들기를 누르면 파티가 만들어져요.' },
  );
  const response = await postAssistantMessages(app, user.accessToken, ask(`${words}에서 같이 해요`));
  expect(response.status).toBe(200);
  return z.object({ proposal: z.object({ place: z.unknown() }) }).parse(response.body).proposal.place;
}

describe("a Proposal's booking page", () => {
  it('gives 종합운동장 its deep link on athletics.snu.ac.kr', async () => {
    const id = await placeIdOf({ name: '종합운동장', number: null });

    expect(await proposeAt('종합운동장', id)).toEqual({
      id,
      name: '종합운동장',
      booking: {
        label: '종합운동장 예약',
        url: 'https://athletics.snu.ac.kr/facility/list?mode=view&facility_idx=1',
      },
    });
  });

  it("gives 301 예약하샤's index", async () => {
    const id = await placeIdOf({ number: '301' });

    expect(await proposeAt('301동', id)).toEqual({ id, name: '제1공학관', booking: STUDY_ROOMS });
  });

  it('gives 63, with no online booking, none', async () => {
    const id = await placeIdOf({ number: '63' });

    expect(await proposeAt('63동', id)).toEqual({ id, name: '학생회관', booking: null });
  });

  it('keeps the booking page from the model', async () => {
    await proposeAt('301동', await placeIdOf({ number: '301' }));

    expect(JSON.stringify(model.toolResults())).not.toContain('ssims');
  });
});

describe('a Proposal sent back with its booking page', () => {
  it('is accepted, and the page is found again from the table, not taken from it', async () => {
    const id = await placeIdOf({ number: '301' });
    const shown = {
      ...GAME,
      board: 'hobby',
      place: { id, name: '제1공학관', booking: { label: '다른 곳', url: 'https://example.com/' } },
      globalEvent: null,
      invitees: [],
    };
    model.script({ tool: 'proposeQuest', input: { ...GAME, placeId: id, capacity: 3 } }, { text: '…' });

    const response = await postAssistantMessages(app, user.accessToken, [
      { role: 'user', text: '301동에서 같이 운동할 사람' },
      { role: 'assistant', text: '만들기를 누르면 파티가 만들어져요.', cards: [], proposal: shown },
      { role: 'user', text: '3명으로' },
    ]);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ proposal: { capacity: 3, place: { id, booking: STUDY_ROOMS } } });
    expect(JSON.stringify(model.received()[0]?.prompt)).not.toContain('example.com');
  });
});
