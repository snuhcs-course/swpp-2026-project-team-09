/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { recordAsked } from './friend-levels.js';
import { getFriends } from './friends.js';
import { expectStatus, setFriendLevel } from './location-sharing.js';
import { MealPlanStage, type Named } from './meal-plan.js';
import * as planQuests from './plan-quests.js';
import { SignalWatcher, signalsWhile } from './signals.js';

// The Friends of a Plan made into a Quest whom the User was not yet asked about after a first Plan with them, named in
// the reply of POST /plans with the User's end of each friendship: the design's worked example with 민수 and 지은 (a
// Tuesday at 11:50). Each test stands on a Tuesday of January 2096, which no other file uses.

const stage = new MealPlanStage();
let watcher: SignalWatcher;

beforeAll(async () => {
  [watcher] = await Promise.all([SignalWatcher.start(), stage.start()]);
});

afterAll(async () => {
  await watcher.stop();
  await stage.stop();
});

const askLevelsSchema = z.object({ askLevels: z.unknown() });

// The worked example with 민수 and 지은, whom the asker lets see the exact position.
async function twoFriendsOn(date: string): Promise<[Named, Named]> {
  await planQuests.workedExample(stage, date);
  const [minsu, jieun] = [await planQuests.minsu(stage), await planQuests.jieun(stage)];
  await expectStatus(setFriendLevel(stage.app, stage.asker, jieun.id, 'exact'), 204);
  return [minsu, jieun];
}

function lunchWith(date: string, friends: Named[]): request.Test {
  return planQuests.makePlanQuest(stage, {
    input: planQuests.inputOf(date, [stage.asker.id, ...friends.map(({ id }) => id)]),
    planId: '학생회관식당',
    startAt: `${date}T12:33:00+09:00`,
    location: null,
  });
}

describe('The reply of POST /plans', () => {
  it("names each Friend of the Plan not yet asked about, in the Plan's order, with the User's end", async () => {
    const date = '2096-01-03';
    const [minsu, jieun] = await twoFriendsOn(date);
    let response: request.Response | undefined;

    const signals = await signalsWhile(stage.app, watcher, null, async () => {
      response = await lunchWith(date, [minsu, jieun]);
    });

    expect(response?.status).toBe(201);
    expect(askLevelsSchema.parse(response?.body).askLevels).toEqual([
      { userId: minsu.id, name: '민수', level: 'building' },
      { userId: jieun.id, name: '지은', level: 'exact' },
    ]);
    const toFriends = signals.filter(({ userIds }) => [minsu, jieun].some(({ id }) => userIds?.includes(id) === true));
    expect(toFriends.length).toBeGreaterThan(0);
    expect(JSON.stringify(toFriends)).not.toMatch(/askLevels|"level"/u);
  });

  it('leaves out a Friend the User was asked about after a Plan, and not one asked about turning location off', async () => {
    const date = '2096-01-10';
    const [minsu, jieun] = await twoFriendsOn(date);
    await expectStatus(recordAsked(stage.app, stage.asker, { userIds: [minsu.id], moment: 'off' }), 204);
    await expectStatus(recordAsked(stage.app, stage.asker, { userIds: [jieun.id], moment: 'plan' }), 204);

    const response = await lunchWith(date, [minsu, jieun]);

    expect(response.status).toBe(201);
    expect(askLevelsSchema.parse(response.body).askLevels).toEqual([
      { userId: minsu.id, name: '민수', level: 'building' },
    ]);
  });

  it('names nobody once every Friend of the Plan was asked about, and the Friends keep their own ends unasked', async () => {
    const date = '2096-01-17';
    const [minsu, jieun] = await twoFriendsOn(date);
    await expectStatus(recordAsked(stage.app, stage.asker, { userIds: [minsu.id, jieun.id], moment: 'plan' }), 204);

    const response = await lunchWith(date, [minsu, jieun]);

    expect(response.status).toBe(201);
    expect(askLevelsSchema.parse(response.body).askLevels).toEqual([]);
    expect((await getFriends(stage.app, minsu)).body).toEqual([
      expect.objectContaining({ id: stage.asker.id, askedOff: false, askedPlan: false }),
    ]);
  });
});
