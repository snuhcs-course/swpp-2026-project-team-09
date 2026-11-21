/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { FreeTimeStage, ROOM } from './free-time.js';
import { befriend, signInUser } from './friends.js';
import { menusMessage, restaurant } from './menus.js';
import { addClass } from './timetable.js';
import { sendAsWorker } from './worker.js';

// A Restaurant card carries the meal's hours kept for its day (P05 ticket 12), which the map writes on the
// Restaurant's flag (P04 ticket 08); null when none were kept. On a Saturday, so that the hours kept here, which are
// kept by kind of day, reach no weekday card of another test.

const stage = new FreeTimeStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const NOTE = '※ 운영시간 : 11:00~14:30';

const cardsSchema = z.object({
  cards: z.array(z.object({ kind: z.literal('restaurant'), restaurant: z.looseObject({ hours: z.unknown() }) })),
});

// findMealRestaurants plans with at least one Friend: 최다온, in a Class at `barely` until 10:00.
async function cardOn(date: string, hours: object[]): Promise<unknown> {
  await stage.asking(date);
  await sendAsWorker(stage.app, '/menus/collected', menusMessage([{ date, restaurants: [restaurant({ hours })] }]));
  await stage.classOn('saturday', '11:00', '12:36', stage.here.id);
  const friend = await signInUser(stage.app, { name: '최다온', department: '경제학부' });
  await befriend(stage.app, stage.reader, friend);
  const times = [{ weekday: 'saturday', startTime: '09:00', endTime: '10:00', placeId: stage.barely.id, room: ROOM }];
  await addClass(stage.app, friend.accessToken, { courseName: '국제경제학', times });
  const response = await stage.send(
    { tool: 'resolveFriend', input: { name: '다온' } },
    { tool: 'findMealRestaurants', input: { date, meal: 'lunch', friendIds: [friend.id] } },
    { tool: 'showRestaurants', input: { keys: ['학생회관식당'] } },
    { text: '…' },
  );
  return cardsSchema.parse(response.body).cards[0]?.restaurant.hours;
}

describe("A Restaurant card's hours", () => {
  it('are those the menus kept for the meal on that kind of day', async () => {
    const hours = await cardOn('2098-05-03', [{ meal: 'lunch', opensAt: '11:00', closesAt: '14:30', line: NOTE }]);

    expect(hours).toEqual({ opensAt: '11:00', closesAt: '14:30' });
  });
});
