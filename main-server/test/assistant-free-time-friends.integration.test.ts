/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { FreeTimeStage, ROOM } from './free-time.js';
import { befriend, signInUser } from './friends.js';
import { keptButHidden, keptPositionIn } from './location-sharing.js';
import { menusMessage, restaurant } from './menus.js';
import { addClass } from './timetable.js';
import { sendAsWorker } from './worker.js';

// The 공강 tools that read the User's Friends, findFreeFriends and findMealRestaurants, at the Assistant's endpoint with
// the scripted model, for a Friend whose position is kept but whom the Friend view puts at the Timetable.

const stage = new FreeTimeStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

describe('A Friend the Friend view puts at the Timetable, whose position is kept', () => {
  it('is found free and eats with the User, and nothing of the position reaches the model or the reply', async () => {
    const date = '2088-07-20';
    await stage.asking(date);
    await sendAsWorker(stage.app, '/menus/collected', menusMessage([{ date, restaurants: [restaurant()] }]));
    await stage.classOn('tuesday', '10:00', '11:00', stage.here.id);
    const friend = await signInUser(stage.app, { name: '윤하은', department: '경제학부' });
    await befriend(stage.app, stage.reader, friend);
    const times = [{ weekday: 'tuesday', startTime: '09:00', endTime: '10:00', placeId: stage.near.id, room: ROOM }];
    await addClass(stage.app, friend.accessToken, { courseName: '국제경제학', times });
    await keptButHidden(stage.app, stage.reader, friend);

    const response = await stage.send(
      { tool: 'findFreeFriends', input: { date, meal: 'lunch' } },
      { tool: 'resolveFriend', input: { name: '윤하은' } },
      { tool: 'findMealRestaurants', input: { date, meal: 'lunch', friendIds: [friend.id] } },
      { text: '…' },
    );

    expect(response.status).toBe(200);
    const [free, , restaurants] = stage.model.toolResults();
    expect(free).toMatchObject({ result: 'found', friends: [{ id: friend.id }] });
    expect(restaurants).toMatchObject({ result: 'found' });
    expect(keptPositionIn(stage.model.received(), response.body)).toEqual([]);
  });
});
