/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { type TravelProvider } from '../src/travel/travel.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, type TestUser } from './friends.js';
import { find, libraryCards } from './library.js';
import { ScriptedModel, type Step } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { addClass } from './timetable.js';
import { refuseKakao } from './walking-route.js';

// A Class left out of a seat asked for today without a start (P05 ticket 70; "관정 열람실 자리 있어?", then "4시 수업
// 휴강이야"), at the Assistant's endpoint with the scripted model, on the seat-arrival example: Wednesday 2026-11-04 at
// 13:50, a Class in 24동 has just ended and the next is at 16:00 in 두산인문관 (8동). The seat is filled from the arrival,
// and leaving the 16:00 Class out leaves nothing to leave for; the conversation then keeps it out with no words.

const NOW = new Date('2026-11-04T13:50:00+09:00');
const DATE = '2026-11-04';
const AT_24 = { latitude: 37.45942, longitude: 126.94989 };
const APP = { clientCapabilities: ['library', 'answer'], context: { location: AT_24 } };

const model = new ScriptedModel();
const walks = new Map<string, number>();
const travel: TravelProvider = {
  walkingSeconds: (from, to) => walks.get(`${from}>${to}`) ?? 3600,
  travel: (from, to) => ({ seconds: walks.get(`${from}>${to}`) ?? 3600, mode: 'walk' }),
};
let app: INestApplication<Server>;
let places: Record<'b24' | 'kwanjeong' | 'doosan', string>;

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, model.model, [], travel);
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
  const { accessToken } = await signInUser(app);
  const listed = await withAccessToken(request(app.getHttpServer()).get('/places'), accessToken).expect(200);
  const all = z.array(z.object({ id: z.string(), number: z.string().nullable() })).parse(listed.body);
  const numbered = (number: string): string => all.find((each) => each.number === number)?.id ?? '';
  places = { b24: numbered('24'), kwanjeong: numbered('62-1'), doosan: numbered('8') };
  walks.set(`${places.b24}>${places.kwanjeong}`, 230);
  walks.set(`${places.kwanjeong}>${places.doosan}`, 220);
});

afterAll(() => app.close());

const times = (start: string, end: string, placeId: string): object[] => [
  { weekday: 'wednesday', startTime: start, endTime: end, placeId, room: '101호' },
];

async function student(): Promise<TestUser> {
  const user = await signInUser(app, { name: '관정이', department: '컴퓨터공학부' });
  await addClass(app, user.accessToken, { courseName: '자료구조', times: times('13:00', '13:50', places.b24) });
  await addClass(app, user.accessToken, { courseName: '철학개론', times: times('16:00', '17:15', places.doosan) });
  return user;
}

const replySchema = z.object({ skipped: z.array(z.object({ date: z.string(), classId: z.string() })).optional() });

async function seat(
  user: TestUser,
  input: object,
  more: object = {},
): Promise<{ leaveBy: unknown; result: unknown; skipped: z.infer<typeof replySchema>['skipped'] }> {
  model.script(find(['7F-7A-zone2']), { tool: 'proposeLibraryBooking', input }, { text: '…' } satisfies Step);
  const response = await postAssistantMessages(app, user.accessToken, ask('관정 열람실 자리 있어?'), {
    ...APP,
    ...more,
  });
  expect(response.status).toBe(200);
  const [card] = libraryCards(response.body);
  return {
    leaveBy: card?.leaveBy,
    result: model.toolResults()[1],
    skipped: replySchema.parse(response.body).skipped,
  };
}

const seatToday = { spaceId: '7F-7A-zone2', date: DATE };

// Partitions: the Class named in the message; the conversation's list sent with no words. Expected values: the
// seat-arrival example's 15:56 to leave for 16:00, and none once 16:00 is left out.
describe("A seat for today, the User's 16:00 Class left out", () => {
  it('is filled with nothing to leave for, and the reply says the Class left out and gives it back', async () => {
    const user = await student();

    const kept = await seat(user, seatToday);
    const freed = await seat(user, { ...seatToday, skipClasses: ['16:00'] });

    expect(kept.leaveBy).toBe('15:56');
    expect(freed.leaveBy).toBeNull();
    expect(freed.result).toMatchObject({ result: 'shown', leaveBy: null, skipped: ['16:00 철학개론'] });
    expect(freed.skipped).toEqual([{ date: DATE, classId: expect.any(String) as unknown }]);
  });

  it('stays filled without it when the next message sends the conversation’s list', async () => {
    const user = await student();
    const { skipped } = await seat(user, { ...seatToday, skipClasses: ['16:00'] });

    const again = await seat(user, seatToday, { context: { ...APP.context, skipped } });

    expect(again.leaveBy).toBeNull();
    expect(again.skipped).toEqual(skipped);
  });
});
