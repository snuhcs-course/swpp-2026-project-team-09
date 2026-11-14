/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { LIBRARY_RULES } from '../src/assistant/library/library-rules.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { type TravelProvider } from '../src/travel/travel.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, type TestUser } from './friends.js';
import { find, LIBRARY, type LibraryCardBody, libraryCards } from './library.js';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel, type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { addClass } from './timetable.js';
import { refuseKakao } from './walking-route.js';

// A seat asked for today without a start, at the Assistant's endpoint with the scripted model, on the design's
// example: Wednesday 2026-11-04 at 13:50 in Korea, a Class in 24동 has just ended, the next is at 16:00 in 두산인문관
// (8동). On foot 24동 to 관정관 (62-1) is 230 s, 4 minutes as shown, and 관정관 to 두산인문관 220 s, also 4.

const NOW = new Date('2026-11-04T13:50:00+09:00');
const AT_24 = { latitude: 37.45942, longitude: 126.94989 };
const ANSWER = { clientCapabilities: ['library', 'answer'] };
const TODAY_ASK_RULE =
  '- When the User gave no time, ask for it, together with anything else missing, in one question ("몇 시부터 몇 시까지 예약할까요?"), and call no tool first.';
const TODAY_DESCRIPTION =
  "Checks a 관정도서관 booking and shows a book card, which books nothing until the User presses 예약하기 on it. Give the space's id from findLibrarySpace, the day, start, and minutes or end, as the User said them, and only what they said of the seat, the room's equipment, the 사용용도 and companions. Answers 'shown' with a summary; 'refused' with every refusal at once, each with its reason and bound; or the space's status with its reason.";

const model = new ScriptedModel();
const walks = new Map<string, number>();
const travel: TravelProvider = {
  walkingSeconds: (from, to) => walks.get(`${from}>${to}`) ?? 3600,
  travel: (from, to) => ({ seconds: walks.get(`${from}>${to}`) ?? 3600, mode: 'walk' }),
};
let app: INestApplication<Server>;
let places: Record<'b24' | 'kwanjeong' | 'doosan', { id: string; name: string }>;

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model, [], travel);
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
  const { accessToken } = await signInUser(app);
  const listed = await withAccessToken(request(app.getHttpServer()).get('/places'), accessToken).expect(200);
  const all = z.array(z.object({ id: z.string(), number: z.string().nullable(), name: z.string() })).parse(listed.body);
  const numbered = (number: string): { id: string; name: string } => {
    const place = all.find((each) => each.number === number);
    if (place === undefined) {
      throw new Error(`The seed has no Place numbered ${number}`);
    }
    return place;
  };
  places = { b24: numbered('24'), kwanjeong: numbered('62-1'), doosan: numbered('8') };
  walks.set(`${places.b24.id}>${places.kwanjeong.id}`, 230);
  walks.set(`${places.kwanjeong.id}>${places.doosan.id}`, 220);
});

afterAll(() => app.close());

const times = (start: string, end: string, placeId: string): object[] => [
  { weekday: 'wednesday', startTime: start, endTime: end, placeId, room: '101호' },
];

// A new User with the afternoon's two Classes.
async function student(): Promise<TestUser> {
  const user = await signInUser(app, { name: '관정이', department: '컴퓨터공학부' });
  await addClass(app, user.accessToken, { courseName: '자료구조', times: times('13:00', '13:50', places.b24.id) });
  await addClass(app, user.accessToken, { courseName: '철학개론', times: times('16:00', '17:15', places.doosan.id) });
  return user;
}

const ANSWER_IN_24 = { ...ANSWER, context: { location: AT_24 } };

async function book(
  input: object,
  more: object = ANSWER_IN_24,
): Promise<{ cards: LibraryCardBody[]; result: unknown }> {
  const user = await student();
  model.script(find(['7F-7A-zone2']), { tool: 'proposeLibraryBooking', input }, { text: '…' } satisfies Step);
  const response = await postAssistantMessages(app, user.accessToken, ask('공부할 자리 잡아 줘'), more);
  expect(response.status).toBe(200);
  return { cards: libraryCards(response.body), result: model.toolResults()[1] };
}

const seatToday = { spaceId: '7F-7A-zone2', date: '2026-11-04' };

describe('A seat asked for today without a start, from an app that draws answers', () => {
  it('is filled from the arrival at 13:54: 14:00 for 360 minutes, with the arrival and the time to leave', async () => {
    const { cards, result } = await book(seatToday);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ key: 'book:7F-7A-zone2:2026-11-04:1400:360', start: '14:00', minutes: 360 });
    expect(cards[0]?.notes[0]).toBe('13:54 도착에 맞춰 최대 시간으로 채웠어요');
    expect(cards[0]?.notes.slice(1)).toEqual(
      expect.arrayContaining([expect.stringContaining('30분 안에 좌석배정기')]) as unknown,
    );
    expect(result).toEqual({
      result: 'shown',
      summary:
        '7층 7A 열람실 2 구역, 오늘 14:00–20:00 예약 카드를 보여 줬어요. 13:54에 도착해요. 16:00 수업이라 15:56엔 나서요. 예약하기를 눌러야 예약돼요.',
      arrival: { at: '13:54', from: places.b24.name, walkMinutes: 4 },
      leaveBy: { at: '15:56', for: '수업', start: '16:00' },
    });
  });

  it('gives the model no coordinate and no Place id', async () => {
    const { result } = await book(seatToday);

    const given = JSON.stringify(result);
    for (const secret of ['latitude', String(AT_24.latitude), places.b24.id, places.kwanjeong.id]) {
      expect(given).not.toContain(secret);
    }
  });

  it('takes a named length of 120 minutes from the arrival, and nothing follows before it ends', async () => {
    const { cards, result } = await book({ ...seatToday, minutes: 120 });

    expect(cards[0]).toMatchObject({ key: 'book:7F-7A-zone2:2026-11-04:1400:120', start: '14:00', minutes: 120 });
    expect(cards[0]?.notes[0]).toBe('13:54 도착에 맞춰 채웠어요');
    expect(result).toEqual({
      result: 'shown',
      summary:
        '7층 7A 열람실 2 구역, 오늘 14:00–16:00 예약 카드를 보여 줬어요. 13:54에 도착해요. 예약하기를 눌러야 예약돼요.',
      arrival: { at: '13:54', from: places.b24.name, walkMinutes: 4 },
      leaveBy: null,
    });
  });
});

describe('From an app that draws answers, as today', () => {
  it('a named start is checked and shown with no arrival', async () => {
    const { cards, result } = await book({ ...seatToday, start: '17:00', minutes: 60 });

    expect(result).toEqual({
      result: 'shown',
      summary: '7층 7A 열람실 2 구역, 오늘 17:00–18:00 예약 카드를 보여 줬어요. 예약하기를 눌러야 예약돼요.',
    });
    expect(cards[0]?.notes.some((note) => note.includes('채웠어요'))).toBe(false);
  });

  it('a room without a start is refused for its start', async () => {
    const user = await student();
    model.script(
      find(['6F-studio']),
      { tool: 'proposeLibraryBooking', input: { spaceId: '6F-studio', date: '2026-11-05', minutes: 60 } },
      { text: '…' },
    );
    await postAssistantMessages(app, user.accessToken, ask('스튜디오 내일'), ANSWER).expect(200);

    expect(model.toolResults()[1]).toEqual({
      result: 'refused',
      refusals: [{ field: 'start', reason: '몇 시부터 예약할지 알려 주세요' }],
    });
  });

  it('a seat for tomorrow is refused as today', async () => {
    const { cards, result } = await book({ ...seatToday, date: '2026-11-05' });

    expect(result).toEqual({
      result: 'refused',
      refusals: [
        { field: 'date', reason: '열람실은 당일만 예약할 수 있어요', bound: '2026-11-04' },
        { field: 'start', reason: '몇 시부터 예약할지 알려 주세요' },
        { field: 'minutes', reason: '몇 시간 또는 몇 시까지 예약할지 알려 주세요' },
      ],
    });
    expect(cards).toEqual([]);
  });
});

interface GivenTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

function givenTools(): Map<string, GivenTool> {
  const tools = (model.received()[0]?.tools ?? []).flatMap((tool) => (tool.type === 'function' ? [tool] : []));
  return new Map(tools.map((tool) => [tool.name, tool]));
}

describe('An app that does not draw answers', () => {
  it('is refused a seat without a start, and is told the rules and the tools of today', async () => {
    const { cards, result } = await book(seatToday, { ...LIBRARY, context: { location: AT_24 } });

    expect(result).toEqual({
      result: 'refused',
      refusals: [
        { field: 'start', reason: '몇 시부터 예약할지 알려 주세요' },
        { field: 'minutes', reason: '몇 시간 또는 몇 시까지 예약할지 알려 주세요' },
      ],
    });
    expect(cards).toEqual([]);
    expect(model.system()).toContain(LIBRARY_RULES);
    expect(model.system()).toContain(TODAY_ASK_RULE);
    expect(givenTools().get('proposeLibraryBooking')?.description).toBe(TODAY_DESCRIPTION);
  });

  it('is given the same tool inputs as an app that draws answers, which is asked for no time of a seat', async () => {
    await book(seatToday, LIBRARY);
    const today = givenTools();
    await book(seatToday);
    const answering = givenTools();

    expect(model.system()).not.toContain(TODAY_ASK_RULE);
    expect(model.system()).toContain('call proposeLibraryBooking without start');
    const shared = [...today.keys()].filter((name) => answering.has(name));
    expect(shared).toContain('proposeLibraryBooking');
    for (const name of shared) {
      expect(answering.get(name)?.inputSchema).toEqual(today.get(name)?.inputSchema);
      if (name !== 'proposeLibraryBooking') {
        expect(answering.get(name)?.description).toBe(today.get(name)?.description);
      }
    }
  });
});
