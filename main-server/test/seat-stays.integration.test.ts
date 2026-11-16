/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { type TravelProvider } from '../src/travel/travel.js';
import { signInUser, type TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { addClass } from './timetable.js';
import { refuseKakao } from './walking-route.js';

// A seat booked on the phone, told to the main server at POST /library/seat-stays, on board AmStudy a1 and a6:
// Wednesday 2026-11-04 at 13:50 in Korea, a seat in 7A 열람실 2 구역 from 14:00 for 6 hours, and 철학개론 at 16:00 in
// 두산인문관 (8동), 220 s on foot from 관정관 (62-1), 4 minutes as shown: the User is told to leave at 15:56.

const NOW = new Date('2026-11-04T13:50:00+09:00');
const SEAT = { spaceId: '7F-7A-zone2', seat: '7193', date: '2026-11-04', start: '14:00', minutes: 360 };

const walks = new Map<string, number>();
const travel: TravelProvider = {
  walkingSeconds: (from, to) => walks.get(`${from}>${to}`) ?? 3600,
  travel: (from, to) => ({ seconds: walks.get(`${from}>${to}`) ?? 3600, mode: 'walk' }),
};
let app: INestApplication<Server>;
let places: Record<'kwanjeong' | 'doosan', string>;

const notificationSchema = z.object({
  kind: z.string(),
  title: z.string(),
  ahead: z.string().nullable(),
  line: z.string(),
});

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, undefined, [], travel);
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
  const { accessToken } = await signInUser(app);
  const listed = await withAccessToken(request(app.getHttpServer()).get('/places'), accessToken).expect(200);
  const all = z.array(z.object({ id: z.string(), number: z.string().nullable() })).parse(listed.body);
  const numbered = (number: string): string => all.find((each) => each.number === number)?.id ?? '';
  places = { kwanjeong: numbered('62-1'), doosan: numbered('8') };
  walks.set(`${places.kwanjeong}>${places.doosan}`, 220);
});

afterAll(() => app.close());

async function student(name: string, classAt: string | null): Promise<TestUser> {
  const user = await signInUser(app, { name, department: '컴퓨터공학부' });
  if (classAt !== null) {
    const times = [
      { weekday: 'wednesday', startTime: classAt, endTime: '17:15', placeId: places.doosan, room: '101호' },
    ];
    await addClass(app, user.accessToken, { courseName: '철학개론', times });
  }
  return user;
}

function stay(user: TestUser, body: object = SEAT): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/library/seat-stays'), user.accessToken)
    .set('Idempotency-Key', randomUUID())
    .send(body);
}

async function leaveBys(user: TestUser): Promise<z.infer<typeof notificationSchema>[]> {
  const response = await withAccessToken(request(app.getHttpServer()).get('/notifications'), user.accessToken);
  return z
    .array(notificationSchema)
    .parse(response.body)
    .filter(({ kind }) => kind === 'leave-by');
}

describe('POST /library/seat-stays', () => {
  it('makes a Quest the User holds alone for the stay at 관정관, and keeps the time to leave for the next Class', async () => {
    const user = await student('좌석이', '16:00');

    const response = await stay(user).expect(201);

    expect(response.body).toMatchObject({
      quest: {
        title: '관정 7층 7A 열람실 2 구역 7193번',
        holders: [{ id: user.id }],
        subQuests: [
          {
            startsAt: '2026-11-04T05:00:00.000Z',
            endsAt: '2026-11-04T11:00:00.000Z',
            place: { placeId: places.kwanjeong },
          },
        ],
      },
      leaveAt: '2026-11-04T06:56:00.000Z',
    });
    expect(await leaveBys(user)).toEqual([
      { kind: 'leave-by', title: '지금 나서요', ahead: '15:56 나설 시각', line: '8동까지 걸어서 4분' },
    ]);
  });

  it('keeps no leave-by when nothing follows during the stay', async () => {
    const user = await student('좌석둘', null);

    const response = await stay(user).expect(201);

    expect(response.body).toMatchObject({ leaveAt: null });
    expect(await leaveBys(user)).toEqual([]);
  });

  it('refuses a room, which is no seat', async () => {
    const user = await student('좌석셋', null);

    const response = await stay(user, { ...SEAT, spaceId: '4F-group-6', seat: '401' }).expect(400);

    expect(response.body).toMatchObject({ code: 'NOT_A_SEAT' });
  });
});
