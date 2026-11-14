/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type QuestDto } from '../src/quests/dto/quest.dto.js';
import { BetterPlanStage, betterSchema, inputOf, instantOn, steps, time, toldUsers } from './better-plan.js';
import { type Named } from './meal-plan.js';
import { attend, connectToDatabase, ownQuest, storeEvent } from './quests.js';
import { refused, SignalWatcher } from './signals.js';

// A better Plan after a decline, at GET /plans/:questId/better, and the change to it at PUT /plans/:questId, over the
// started server with the scripted model, the seed's walking table, and Places: the Leader makes the Quest of the
// design's worked example (a Tuesday at 11:50) with 민수 and 지은 at POST /plans. Each test stands on a Tuesday of
// November and December 2088, which no other file uses.

const stage = new BetterPlanStage();
let watcher: SignalWatcher;

beforeAll(async () => {
  [watcher] = await Promise.all([SignalWatcher.start(), stage.start()]);
});

afterAll(async () => {
  await watcher.stop();
  await stage.stop();
});

describe('After 지은 declines (the worked example)', () => {
  it('offers 302동식당 from 12:15 to 12:43 with 28 minutes against the Student Center’s 22', async () => {
    const date = '2088-11-02';
    const { minsu, questId } = await stage.declined(date);
    const [p302, p63] = [await stage.numbered('302'), await stage.numbered('63')];

    const response = await stage.getBetter(stage.asker, questId);

    expect(response.status).toBe(200);
    const { current, better, input } = betterSchema.parse(response.body);
    expect(current).toEqual({
      place: { placeId: p63.id, label: '63동', latitude: p63.latitude, longitude: p63.longitude },
      startAt: time(date, '12:33'),
      endAt: time(date, '12:55'),
      togetherMinutes: 22,
    });
    expect(better).toMatchObject({
      id: '302동식당',
      title: '302동식당에서 점심',
      place: { placeId: p302.id },
      startAt: time(date, '12:15'),
      endAt: time(date, '12:43'),
      togetherMinutes: 28,
    });
    expect(input).toEqual(inputOf(date, [stage.asker.id, minsu.id]));
  });
});

describe('After 지은 declines, the change to the better Plan', () => {
  it('changes the Quest to it, keeps 민수 a Holder, tells both, and offers nothing more', async () => {
    const date = '2088-11-30';
    const { minsu, questId } = await stage.declined(date);
    const p302 = await stage.numbered('302');
    const { input } = betterSchema.parse((await stage.getBetter(stage.asker, questId)).body);
    const body = { input, planId: '302동식당', startAt: time(date, '12:15'), location: null };
    let response: request.Response | undefined;

    const { planChanged, questsChanged } = await stage.bothSignalsWhile(watcher, async () => {
      response = await stage.changePlan(stage.asker, questId, body);
    });

    expect(response?.status).toBe(200);
    const quest = z.custom<QuestDto>().parse(response?.body);
    expect(quest).toMatchObject({ id: questId, title: '302동식당에서 점심', leader: { id: stage.asker.id } });
    expect(quest.holders.map(({ id }) => id)).toEqual([stage.asker.id, minsu.id]);
    const at = instantOn(date);
    expect(steps(quest)).toEqual([
      { title: '302동식당에서 식사', startsAt: at('12:15'), endsAt: at('12:43'), placeId: p302.id },
    ]);
    expect(planChanged.map(({ payload }) => payload)).toEqual([{ questId }]);
    expect(toldUsers(planChanged)).toEqual([stage.asker.id, minsu.id].toSorted());
    expect(toldUsers(questsChanged)).toEqual([stage.asker.id, minsu.id].toSorted());
    const again = betterSchema.parse((await stage.getBetter(stage.asker, questId)).body);
    expect(again.better).toBeNull();
    expect(again.current).toMatchObject({
      startAt: time(date, '12:15'),
      endAt: time(date, '12:43'),
      togetherMinutes: 28,
    });
  });
});

describe('With 지은 still invited and nobody declined', () => {
  const date = '2088-11-09';
  let minsu: Named;
  let jieun: Named;
  let questId: string;
  let jieunInvitation: string;

  beforeAll(async () => {
    ({ minsu, jieun, questId, jieunInvitation } = await stage.workedQuest(date));
  });

  it('offers no better Plan: the Quest stands at the first Plan of its people', async () => {
    const response = await stage.getBetter(stage.asker, questId);

    expect(response.status).toBe(200);
    const { current, better, input } = betterSchema.parse(response.body);
    expect(current).toMatchObject({ startAt: time(date, '12:33'), endAt: time(date, '12:55'), togetherMinutes: 22 });
    expect(better).toBeNull();
    expect(input).toEqual(inputOf(date, [stage.asker.id, minsu.id, jieun.id]));
  });

  it('keeps the waiting invitation through a change, and tells 지은 with the Holders', async () => {
    const body = {
      input: inputOf(date, [stage.asker.id, jieun.id, minsu.id]),
      planId: '학생회관식당',
      startAt: time(date, '12:33'),
      location: null,
    };
    let response: request.Response | undefined;

    const { planChanged, questsChanged } = await stage.bothSignalsWhile(watcher, async () => {
      response = await stage.changePlan(stage.asker, questId, body);
    });

    expect(response?.status).toBe(200);
    expect(await stage.invitationTo(jieun, questId)).toBe(jieunInvitation);
    const everyone = [stage.asker.id, minsu.id, jieun.id].toSorted();
    expect(planChanged.map(({ payload }) => payload)).toEqual([{ questId }]);
    expect(toldUsers(planChanged)).toEqual(everyone);
    expect(toldUsers(questsChanged)).toEqual(everyone);
  });
});

const making = (date: string, people: string[], startAt = '12:15'): object => ({
  input: inputOf(date, people),
  planId: '302동식당',
  startAt: time(date, startAt),
  location: null,
});

describe('Refused at both routes', () => {
  const date = '2088-11-16';
  let minsu: Named;
  let stranger: Named;
  let questId: string;

  beforeAll(async () => {
    await stage.asking(date, '11:50', '낯선 사람');
    stranger = stage.asker;
    ({ minsu, questId } = await stage.declined(date));
  });

  it.each<[string, 'minsu' | 'stranger', number, string]>([
    ['a Holder who does not lead', 'minsu', 403, 'NOT_QUEST_LEADER'],
    ['a User who holds nothing', 'stranger', 404, 'QUEST_NOT_FOUND'],
  ])('%s', async (_, who, status, code) => {
    const user = who === 'minsu' ? minsu : stranger;
    const read = await stage.getBetter(user, questId);
    const changed = await stage.changePlan(user, questId, making(date, [stage.asker.id, minsu.id]));

    expect(read.status).toBe(status);
    expect(read.body).toMatchObject(refused(status, code));
    expect(changed.status).toBe(status);
    expect(changed.body).toMatchObject(refused(status, code));
  });
});

describe('Refused changes', () => {
  const date = '2088-12-07';
  let minsu: Named;
  let jieun: Named;
  let questId: string;

  beforeAll(async () => {
    ({ minsu, jieun, questId } = await stage.declined(date));
  });

  it('an input of other people with 400 PLAN_PEOPLE_CHANGED', async () => {
    const people = [stage.asker.id, minsu.id, jieun.id];

    const response = await stage.changePlan(stage.asker, questId, making(date, people));

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(refused(400, 'PLAN_PEOPLE_CHANGED'));
  });

  it('a Plan of another start with 409 PLAN_CHANGED, leaving the Quest as it was', async () => {
    const response = await stage.changePlan(stage.asker, questId, making(date, [stage.asker.id, minsu.id], '12:16'));

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PLAN_CHANGED'));
    const { current } = betterSchema.parse((await stage.getBetter(stage.asker, questId)).body);
    expect(current).toMatchObject({ startAt: time(date, '12:33') });
  });
});

describe('A Quest with no step to plan from', () => {
  const date = '2088-11-23';

  beforeAll(async () => {
    await stage.asking(date, '11:50');
  });

  it('answers no better Plan when its only step has no Place', async () => {
    const questId = await ownQuest(stage.app, stage.asker, {
      title: '점심',
      subQuest: { title: '점심', startsAt: time(date, '12:30'), endsAt: time(date, '13:00') },
    });

    const response = await stage.getBetter(stage.asker, questId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ current: null, better: null, input: null });
  });

  it('refuses a change to a Quest for a Global Event with 409 ATTENDING_SUB_QUEST', async () => {
    const prisma = connectToDatabase();
    const event = await storeEvent(prisma);
    await prisma.$disconnect();
    const questId = z.object({ id: z.string() }).parse((await attend(stage.app, stage.asker, event.id)).body).id;

    const response = await stage.changePlan(stage.asker, questId, making(date, [stage.asker.id]));

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ATTENDING_SUB_QUEST'));
  });
});
