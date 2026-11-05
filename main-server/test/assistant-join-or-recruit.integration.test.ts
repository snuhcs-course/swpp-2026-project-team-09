/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase, joinQuest, ownQuest } from './quests.js';
import { ScriptedModel, type Step } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// Join if one exists, recruit if not, with the scripted model in the model's place: what the instructions tell the model
// and what a reply holds when the model follows them. The files share the database, so each test seeds what it reads on
// a day of 2083 of its own, which no other file uses, and always searches on that day.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let leader: TestUser;
let reader: TestUser;
let place301: string;
const model = new ScriptedModel();

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  prisma = connectToDatabase();
  leader = await signInUser(app);
  reader = await signInUser(app);
  place301 = (await prisma.place.findFirstOrThrow({ where: { number: '301' } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

function questOn(day: string, body: object = {}): Promise<string> {
  return ownQuest(app, leader, {
    joinPolicy: 'open',
    subQuest: { title: '모임', startsAt: new Date(`${day}T18:00:00+09:00`).toISOString() },
    ...body,
  });
}

describe('the instructions on a request to recruit', () => {
  let system: string;

  beforeAll(async () => {
    model.script({ text: '…' });
    await postAssistantMessages(app, reader.accessToken, ask('안녕'));
    system = model.system();
  });

  it.each([
    ['searching first', 'first look for one they could join'],
    [
      'no search once the User asked for a new one',
      'has said in this conversation, this message included, to make a new one',
    ],
    ['the seven days of an activity with no day', 'the next 7 days from today'],
    ['every activity of a day with no activity', 'every activity, with no words and no Board'],
    ['asking only when both are missing', 'With neither an activity nor a day, ask'],
    ['a named time', '30 minutes before it to 30 minutes after it'],
    ['the parts of the day', '아침 is 07:00–11:00, 점심 11:00–16:00 and 저녁 17:00–22:00'],
    ['a named Place through the radius', 'leave radius out, so that it means 300 m or less'],
    ['Open and Approval only', 'Offer only Open and Approval 파티'],
    ['the most Holders first', 'the highest holderCount first'],
    ['same meaning and look-alikes', 'Words of the same meaning are the same activity'],
    ['a number of people', 'capacity N'],
    ['a named Global Event', 'with no time, Place or words'],
    ['never joining', 'Never join for the User'],
    ['the line that none was found', 'a line saying that none was found'],
  ])('hold %s', (_, rule) => {
    expect(system).toContain(rule);
  });
});

describe('a reply to a request to recruit, with Quests found', () => {
  it('shows the Quests found as cards in the order given, and joins none of them', async () => {
    const day = '2083-04-03';
    const fewer = await questOn(day, { capacity: 4 });
    const more = await questOn(day, { capacity: 4 });
    const joiner = await signInUser(app);
    await joinQuest(app, joiner, more).expect(201);
    model.script(
      { tool: 'searchRecruitingQuests', input: { from: day, to: day } },
      { tool: 'showQuests', input: { ids: [more, fewer] } },
      { text: '이 파티에 참여해 볼래요?' },
    );

    const response = await postAssistantMessages(app, reader.accessToken, ask('같이 갈 사람 구해 줘')).expect(200);

    expect(response.body).toMatchObject({
      text: '이 파티에 참여해 볼래요?',
      cards: [
        { kind: 'quest', quest: { id: more, holderCount: 2 } },
        { kind: 'quest', quest: { id: fewer, holderCount: 1 } },
      ],
      proposal: null,
    });
    expect(await prisma.questHolder.count({ where: { userId: reader.id } })).toBe(0);
    expect(await prisma.questJoinRequest.count({ where: { userId: reader.id } })).toBe(0);
  });
});

describe('a reply to a request to recruit, with none found', () => {
  it('holds the Proposal and the line that none was found', async () => {
    const day = '2083-04-04';
    const proposal = {
      title: '같이 가요',
      description: '같이 갈 사람 모집해요',
      joinPolicy: 'open',
      board: 'hobby',
      capacity: 4,
      startsAt: `${day}T18:00:00+09:00`,
    };
    model.script(
      { tool: 'searchRecruitingQuests', input: { from: day, to: day } },
      { tool: 'proposeQuest', input: proposal },
      { text: '맞는 파티를 찾지 못했어요. 만들기를 누르면 파티가 만들어져요.' },
    );

    const response = await postAssistantMessages(app, reader.accessToken, ask('같이 갈 사람 구해 줘')).expect(200);

    expect(model.toolResults()).toEqual([
      expect.objectContaining({ result: 'none' }),
      expect.objectContaining({ result: 'proposed' }),
    ]);
    expect(response.body).toMatchObject({
      text: '맞는 파티를 찾지 못했어요. 만들기를 누르면 파티가 만들어져요.',
      cards: [],
      proposal: { title: '같이 가요', capacity: 4 },
    });
  });
});

// What a search returned to the model, as far as the note goes.
const searchResult = z.looseObject({
  result: z.string(),
  note: z.string().optional(),
  quests: z.array(z.looseObject({ id: z.string() })).optional(),
});

type SearchResult = z.output<typeof searchResult>;

const NOTE_DAY = '2083-04-02';
const NOTE_WINDOW = { from: NOTE_DAY, to: NOTE_DAY };
const RESOLVING: Step = { tool: 'resolvePlace', input: { words: '301동' } };

// What each search returned to the model, after the script ran on the conversation; resolvers' answers left out.
async function searchesOf(steps: Step[], messages: object[] = ask('301동 근처 파티 있어?')): Promise<SearchResult[]> {
  model.script(...steps, { text: '…' });
  await postAssistantMessages(app, reader.accessToken, messages).expect(200);
  const results = model.toolResults().map((result) => searchResult.parse(result));
  return results.filter(({ result }) => result !== 'one');
}

describe('a search after resolvePlace answered one Place in the message, not given it', () => {
  let first: string;
  let second: string;

  beforeAll(async () => {
    first = await questOn(NOTE_DAY, { capacity: 4 });
    second = await questOn(NOTE_DAY, { capacity: 5 });
  });

  it('says placeId was not given, naming the Place, and keeps the candidates and their order', async () => {
    const [noted] = await searchesOf([RESOLVING, { tool: 'searchRecruitingQuests', input: NOTE_WINDOW }]);
    const [plain] = await searchesOf([{ tool: 'searchRecruitingQuests', input: NOTE_WINDOW }]);

    expect(noted?.note).toContain('placeId was not given');
    expect(noted?.note).toContain(`제1공학관 (301동), placeId ${place301}`);
    expect({ ...noted, note: undefined }).toEqual({ ...plain, note: undefined });
    expect(plain?.quests?.map(({ id }) => id)).toEqual([first, second]);
    expect(plain?.note).toBeUndefined();
  });

  it('says so of a search of Global Events with no place, also when it found none', async () => {
    const [noted] = await searchesOf([RESOLVING, { tool: 'searchGlobalEvents', input: NOTE_WINDOW }]);

    expect(noted?.result).toBe('none');
    expect(noted?.note).toContain('place was not given');
    expect(noted?.note).toContain('제1공학관 (301동)');
  });
});

describe('a search with no note', () => {
  it('is one given the Place resolvePlace answered', async () => {
    const searches = await searchesOf([
      RESOLVING,
      { tool: 'searchRecruitingQuests', input: { ...NOTE_WINDOW, placeId: place301 } },
      { tool: 'searchGlobalEvents', input: { ...NOTE_WINDOW, place: '301동' } },
    ]);

    expect(searches.map(({ note }) => note)).toEqual([undefined, undefined]);
  });

  it("is one in a message with no resolvePlace, though an earlier message's Proposal holds a Place", async () => {
    const proposal = {
      title: '저녁 같이 먹어요',
      description: '저녁 같이 먹어요',
      joinPolicy: 'open',
      board: 'meal',
      capacity: 4,
      startsAt: `${NOTE_DAY}T18:00:00+09:00`,
      place: { id: place301, name: '제1공학관' },
    };
    const searches = await searchesOf(
      [{ tool: 'searchRecruitingQuests', input: NOTE_WINDOW }],
      [
        { role: 'user', text: '301동에서 저녁 먹을 사람 모집해 줘' },
        { role: 'assistant', text: '만들기를 누르면 파티가 만들어져요.', cards: [], proposal },
        { role: 'user', text: '그 전에 들어갈 파티 있어?' },
      ],
    );

    expect(searches.map(({ note }) => note)).toEqual([undefined]);
  });
});
