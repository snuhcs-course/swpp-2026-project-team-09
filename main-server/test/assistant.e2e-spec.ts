/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { ask, postAssistantMessages } from './assistant.js';
import { daysOf, menusMessage, restaurant } from './menus.js';
import { ScriptedModel } from './scripted-model.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';
import { refuseMatchServer } from './match-server.js';
import { sendAsWorker } from './worker.js';

// The chat Assistant's endpoint, its getMenus tool and its showOnMap presenter, with the scripted model in the model's
// place. getShuttle is tested in shuttle.e2e-spec.ts, the one file that sends shuttle messages.

let app: INestApplication<Server>;
let accessToken: string;
const model = new ScriptedModel();

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  ({ accessToken } = await signIn(app));
});

afterAll(async () => {
  await app.close();
});

const newDay = daysOf('2027-01');

// What `restaurant()` serves, as getMenus gives it to the model: the lines' text, and the time of the Collection in
// Korea.
const studentCentre = {
  name: '학생회관식당',
  collectedAt: '2026-10-31T21:00:00+09:00',
  meals: [{ meal: 'lunch', lines: ['제육볶음 : 6,000원', '※ 운영시간 : 11:00~14:30'] }],
};

describe('The chat Assistant', () => {
  it("answers with the model's text", async () => {
    model.script({ text: '안녕하세요! 무엇을 도와드릴까요?' });

    const response = await postAssistantMessages(app, accessToken, ask('안녕'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ text: '안녕하세요! 무엇을 도와드릴까요?', mapButtons: [], cards: [] });
  });

  it("gives the model the conversation, the User's new message last", async () => {
    model.script({ text: '한식은 어때요?' });

    await postAssistantMessages(app, accessToken, [
      { role: 'user', text: '점메추' },
      { role: 'assistant', text: '어떤 게 당기세요? 한식, 일식, 양식 …' },
      { role: 'user', text: '한식' },
    ]);

    const [call] = model.received();
    expect(call?.prompt.filter(({ role }) => role !== 'system')).toEqual([
      { role: 'user', content: [{ type: 'text', text: '점메추' }] },
      { role: 'assistant', content: [{ type: 'text', text: '어떤 게 당기세요? 한식, 일식, 양식 …' }] },
      { role: 'user', content: [{ type: 'text', text: '한식' }] },
    ]);
  });

  it('refuses a request without an access token, and does not call the model', async () => {
    model.script({ text: '안녕하세요!' });

    const response = await postAssistantMessages(app, undefined, ask('안녕'));

    expect(response.status).toBe(401);
    expect(model.received()).toHaveLength(0);
  });

  it("refuses a conversation that does not end with the User's message", async () => {
    model.script({ text: '안녕하세요!' });

    const response = await postAssistantMessages(app, accessToken, [{ role: 'assistant', text: '안녕하세요!' }]);

    expect(response.status).toBe(400);
    expect(model.received()).toHaveLength(0);
  });
});

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The date, the weekday and the time of day in Korea, which keeps +09:00 all year: "2027-01-04 Monday 09:05".
function inKorea(at: Date): string {
  const korea = new Date(at.getTime() + 9 * 60 * 60 * 1000);
  const [date, time] = korea.toISOString().split('T');
  return `${date} ${WEEKDAYS[korea.getUTCDay()]} ${time?.slice(0, 5)}`;
}

describe("The chat Assistant's system prompt", () => {
  it('carries the current date, weekday and time in Korea', async () => {
    model.script({ text: '오늘은 …' });

    const before = new Date();
    await postAssistantMessages(app, accessToken, ask('오늘 무슨 요일이야?'));
    const after = new Date();

    // The minute may turn while the request runs.
    expect([inKorea(before), inKorea(after)].some((now) => model.system().includes(now))).toBe(true);
  });
});

describe('getMenus', () => {
  it("gives the model the day's menus, each restaurant with when it was collected", async () => {
    const date = newDay();
    await sendAsWorker(app, '/menus/collected', menusMessage([{ date, restaurants: [restaurant()] }]));
    model.script({ tool: 'getMenus', input: { date } }, { text: '학생회관식당은 제육볶음이에요.' });

    const response = await postAssistantMessages(app, accessToken, ask('오늘 점심 뭐 나와?'));

    expect(response.body).toEqual({ text: '학생회관식당은 제육볶음이에요.', mapButtons: [], cards: [] });
    expect(model.toolResults()).toEqual([{ result: 'found', date, restaurants: [studentCentre] }]);
  });
});

describe('getMenus, by day and meal', () => {
  it('says "none" with the reason for a day with no menu collected, and gives no other day\'s', async () => {
    const [stored, empty] = [newDay(), newDay()];
    await sendAsWorker(app, '/menus/collected', menusMessage([{ date: stored, restaurants: [restaurant()] }]));
    model.script({ tool: 'getMenus', input: { date: empty } }, { text: '그날 메뉴는 아직 없어요.' });

    await postAssistantMessages(app, accessToken, ask('내일 학식 뭐야?'));

    expect(model.toolResults()).toEqual([{ result: 'none', reason: `No menu was collected for ${empty}.` }]);
  });

  it('gives only the meal asked for, and leaves out the restaurants that do not serve it', async () => {
    const date = newDay();
    const dinner = { meal: 'dinner', text: '돈까스 : 5,500원', kind: 'dish', name: '돈까스', price: 5500 };
    const both = restaurant({ name: '자하연식당', lines: [...studentCentreLines(), dinner] });
    await sendAsWorker(app, '/menus/collected', menusMessage([{ date, restaurants: [restaurant(), both] }]));
    model.script({ tool: 'getMenus', input: { date, meal: 'dinner' } }, { text: '자하연식당은 돈까스예요.' });

    await postAssistantMessages(app, accessToken, ask('저녁 뭐 나와?'));

    expect(model.toolResults()).toEqual([
      {
        result: 'found',
        date,
        restaurants: [
          { ...studentCentre, name: '자하연식당', meals: [{ meal: 'dinner', lines: ['돈까스 : 5,500원'] }] },
        ],
      },
    ]);
  });

  it('says "none" when no restaurant serves the meal that day', async () => {
    const date = newDay();
    await sendAsWorker(app, '/menus/collected', menusMessage([{ date, restaurants: [restaurant()] }]));
    model.script({ tool: 'getMenus', input: { date, meal: 'breakfast' } }, { text: '아침은 없어요.' });

    await postAssistantMessages(app, accessToken, ask('아침 뭐 나와?'));

    expect(model.toolResults()).toEqual([
      { result: 'none', reason: `No restaurant has a breakfast menu collected for ${date}.` },
    ]);
  });
});

describe('getMenus, by restaurant', () => {
  it('gives only the restaurant named, matched without spaces', async () => {
    const date = newDay();
    await sendAsWorker(
      app,
      '/menus/collected',
      menusMessage([{ date, restaurants: [restaurant(), restaurant({ name: '자하연식당 2층' })] }]),
    );
    model.script({ tool: 'getMenus', input: { date, restaurant: '자하연식당2층' } }, { text: '…' });

    await postAssistantMessages(app, accessToken, ask('자하연식당2층 메뉴'));

    expect(model.toolResults()).toEqual([
      { result: 'found', date, restaurants: [{ ...studentCentre, name: '자하연식당 2층' }] },
    ]);
  });
});

describe('showOnMap', () => {
  it('puts the map button under the reply', async () => {
    model.script({ tool: 'showOnMap', input: { layer: 'dining' } }, { text: '오늘 메뉴예요.' });

    const response = await postAssistantMessages(app, accessToken, ask('오늘 점심 뭐 나와?'));

    expect(response.body).toEqual({ text: '오늘 메뉴예요.', mapButtons: ['dining'], cards: [] });
    expect(model.toolResults()).toEqual([{ result: 'shown', layer: 'dining' }]);
  });

  it('puts each layer once, in the order first shown', async () => {
    model.script(
      { tool: 'showOnMap', input: { layer: 'shuttle' } },
      { tool: 'showOnMap', input: { layer: 'dining' } },
      { tool: 'showOnMap', input: { layer: 'shuttle' } },
      { text: '…' },
    );

    const response = await postAssistantMessages(app, accessToken, ask('셔틀이랑 식당 지도에서 보여줘'));

    expect(response.body).toMatchObject({ mapButtons: ['shuttle', 'dining'] });
  });

  it('refuses an unknown layer back to the model, and puts no button', async () => {
    model.script({ tool: 'showOnMap', input: { layer: 'library' } }, { text: '열람실은 아직 지원하지 않아요.' });

    const response = await postAssistantMessages(app, accessToken, ask('도서관 지도에서 보여줘'));

    expect(response.body).toEqual({ text: '열람실은 아직 지원하지 않아요.', mapButtons: [], cards: [] });
    expect(model.toolResults()).toEqual([expect.stringContaining('layer')]);
  });
});

// The lunch lines of `restaurant()`, as the worker sends them.
function studentCentreLines(): object[] {
  return [
    { meal: 'lunch', text: '제육볶음 : 6,000원', kind: 'dish', name: '제육볶음', price: 6000 },
    { meal: 'lunch', text: '※ 운영시간 : 11:00~14:30', kind: 'note', name: null, price: null },
  ];
}
