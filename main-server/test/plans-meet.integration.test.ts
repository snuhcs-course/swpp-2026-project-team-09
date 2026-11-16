/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type MeetInput } from '../src/assistant/dto/answer.dto.js';
import { type QuestDto } from '../src/quests/dto/quest.dto.js';
import { BetterPlanStage, betterSchema, instantOn, steps, time } from './better-plan.js';
import { type TestUser } from './friends.js';
import { pointOf, positionOf } from './invitation-card.js';
import { expectStatus, shareAt, uploadPosition } from './location-sharing.js';
import { type Named, type Place } from './meal-plan.js';
import { makePlanQuest } from './plan-quests.js';
import { answerInvitation, getInvitations } from './quest-recruiting.js';
import { getQuests } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { ANY_STRING } from './signals.js';

// "만나고 싶다" made into a Quest at POST /plans over the started server with the seed's walking table and Places: board
// a5 of the design's row 6 (a Tuesday at 12:10), the invitee's own way on their invitation's card, the Leader's time to
// leave, a decline, a change at PUT /plans/:questId, and a meet with nobody. Each test stands on a Tuesday of January
// 2080, which no other file uses.

// Making a party takes a few seconds of requests.
vi.setConfig({ testTimeout: 30_000 });

const stage = new BetterPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const invitationSchema = z.object({ id: z.string(), userId: z.string() });

type Invitation = z.infer<typeof invitationSchema>;

const replySchema = z.object({ quest: z.custom<QuestDto>(), invitations: z.array(invitationSchema) });

interface A5 {
  friend: Named;
  p301: Place;
  p302: Place;
}

// The asker at 301동 after a Class there, with Classes in 24동 at 13:00 and in 58동 at 17:00, and 민수 seen at the
// building level in 302동, with Classes there until 12:15 and from 15:30, as assistant-meet's a5.
async function a5(date: string): Promise<A5> {
  await stage.asking(date, '12:10');
  await stage.menusOn(date, ['301동식당', '302동식당', '학생회관식당']);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  await stage.classAt(stage.asker, '13:00', '13:50', '24');
  await stage.classAt(stage.asker, '17:00', '18:15', '58');
  const friend = await stage.friend('민수');
  await stage.classAt(friend, '11:00', '12:15', '302');
  await stage.classAt(friend, '15:30', '16:45', '302');
  await shareAt(stage.app, stage.asker, friend, 'building');
  const [p301, p302] = [await stage.numbered('301'), await stage.numbered('302')];
  await expectStatus(uploadPosition(stage.app, friend, positionOf(p302)), 200);
  return { friend, p301, p302 };
}

const meetInput = (date: string, people: string[]): MeetInput => ({
  kind: 'meet',
  date,
  people: people.map((userId) => ({ userId, constraints: [] })),
  window: { from: null, until: null },
  placeId: null,
});

// The Plan of a5 named, made into a Quest by the asker at 301동.
function made(date: string, { friend, p301 }: A5, planId: string, start: string): request.Test {
  return makePlanQuest(stage, {
    input: meetInput(date, [stage.asker.id, friend.id]),
    planId,
    startAt: time(date, start),
    location: positionOf(p301),
  });
}

function getCard(user: TestUser, invitationId: string): request.Test {
  return withAccessToken(
    request(stage.app.getHttpServer()).get(`/quest-invitations/${invitationId}`),
    user.accessToken,
  );
}

const invitationOf = (invitations: Invitation[], { id }: Named): string => {
  const invitation = invitations.find(({ userId }) => userId === id);
  if (invitation === undefined) {
    throw new Error('Nobody of that id is invited');
  }
  return invitation.id;
};

async function invitedQuestIds(user: Named): Promise<string[]> {
  const listed = z
    .array(z.object({ quest: z.object({ id: z.string() }) }))
    .parse((await getInvitations(stage.app, user)).body);
  return listed.map(({ quest }) => quest.id);
}

// A Quest of a5 as its Leader reads it once made.
const meetQuestOf = (title: string): object => ({
  title,
  globalEvent: null,
  leader: { id: stage.asker.id, name: '유상' },
  capacity: 4,
  joinPolicy: 'closed',
  board: null,
  holders: [{ id: stage.asker.id }],
});

// The one step a meet's Plan of two makes.
const meetStepOf = (date: string, title: string, [start, end]: [string, string], { id }: Place): object => ({
  title,
  startsAt: instantOn(date)(start),
  endsAt: instantOn(date)(end),
  placeId: id,
});

// The Leader's time to leave as GET /notifications lists it.
const leaveByOf = (date: string, questId: string, clock: string, line: string): object => ({
  id: `leave-by:party:${questId}`,
  kind: 'leave-by',
  title: '지금 나서요',
  ahead: `${clock} 나설 시각`,
  line,
  at: time(date, clock),
  url: `/main?card=party:${questId}`,
});

// 민수's card for 302동 앞: his Class ends in 302동 itself at 12:15.
const sameBuildingCardOf = (date: string, { p302 }: A5): object => ({
  gathering: { place: pointOf(p302, '302동'), startAt: time(date, '12:15'), endAt: time(date, '12:43') },
  way: {
    status: 'ok',
    origin: { place: pointOf(p302, '302동'), basis: 'timetable' },
    leaveAt: time(date, '12:15'),
    walkMinutes: 0,
    arriveAt: time(date, '12:15'),
    meeting: null,
    scene: {
      places: [{ place: pointOf(p302, '302동'), role: 'pick', tag: null }, { role: 'next' }],
      flags: [{ at: positionOf(p302), text: '12:15 302동 앞에서 만나기', role: 'place' }],
    },
  },
});

// 민수's way to 301동 앞: out of his Class in 302동 at 12:15, 3 minutes on foot, and back for his Class at 15:30.
const walkingWayOf = (date: string, { friend, p301, p302 }: A5): object => ({
  status: 'ok',
  origin: { place: pointOf(p302, '302동'), basis: 'timetable' },
  leaveAt: time(date, '12:15'),
  walkMinutes: 3,
  arriveAt: time(date, '12:18'),
  meeting: null,
  leaveBy: time(date, '15:27'),
  lines: [
    [
      { text: '12:15에 수업이 끝나면 바로 나서면 돼요.', strong: true },
      { text: ' 걸어서 3분.', strong: false },
    ],
    [{ text: '15:30 수업이라 15:27엔 나서요.', strong: false }],
  ],
  scene: {
    people: [{ userId: friend.id, at: positionOf(p302), source: 'timetable', tag: '나 · 3분' }],
    routes: [
      { userId: friend.id, role: 'me', from: positionOf(p302), to: positionOf(p301), minutes: 3 },
      { userId: friend.id, role: 'next', from: positionOf(p301), to: positionOf(p302), minutes: 3 },
    ],
    flags: [{ at: positionOf(p301), text: '12:18 301동 앞에서 만나기', role: 'place' }],
  },
});

const linesSchema = z.object({ way: z.object({ lines: z.array(z.unknown()) }) });

describe('a5: the first Plan, 302동 앞 from 12:15, made into a Quest', () => {
  const date = '2080-01-02';
  let world: A5;
  let status = 0;
  let quest: QuestDto;
  let invitations: Invitation[];

  beforeAll(async () => {
    world = await a5(date);
    const response = await made(date, world, '302동 앞', '12:15');
    status = response.status;
    ({ quest, invitations } = replySchema.parse(response.body));
  });

  it('is the Quest of the Plan’s title and Sub Quest, led by the asker, with 민수 invited', async () => {
    expect(status).toBe(201);
    expect(quest).toMatchObject(meetQuestOf('302동 앞에서 만나기'));
    expect(steps(quest)).toEqual([meetStepOf(date, '302동 앞에서 만나기', ['12:15', '12:43'], world.p302)]);
    expect(invitations).toEqual([{ id: ANY_STRING, userId: world.friend.id }]);
    expect(await invitedQuestIds(world.friend)).toEqual([quest.id]);
  });

  it('keeps the Leader’s time to leave: 3 minutes from 301동 to 302동 앞, setting out at 12:12', async () => {
    await vi.waitFor(async () => {
      expect((await stage.notificationsOf(stage.asker)).body).toEqual([
        leaveByOf(date, quest.id, '12:12', '302동 앞까지 걸어서 3분'),
      ]);
    });
  });

  it('gives 민수 his own way on his card: his Class ends in the same building', async () => {
    const response = await getCard(world.friend, invitationOf(invitations, world.friend));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(sameBuildingCardOf(date, world));
    expect(linesSchema.parse(response.body).way.lines[0]).toEqual([
      { text: '같은 건물이라 걷지 않아도 돼요.', strong: false },
    ]);
  });

  it('offers the Leader no better Plan, as a meal, once 민수 declines', async () => {
    await answerInvitation(stage.app, world.friend, invitationOf(invitations, world.friend), 'decline').expect(204);

    const response = await stage.getBetter(stage.asker, quest.id);

    expect(response.status).toBe(200);
    expect(betterSchema.parse(response.body)).toEqual({ current: null, better: null, input: null });
  });
});

describe('a5: the second Plan, 301동 앞 from 12:18', () => {
  it('gives 민수 his way out of his Class in 302동, 3 minutes on foot', async () => {
    const date = '2080-01-09';
    const world = await a5(date);

    const response = await made(date, world, '301동 앞', '12:18');

    expect(response.status).toBe(201);
    const { quest, invitations } = replySchema.parse(response.body);
    expect(steps(quest)).toEqual([meetStepOf(date, '301동 앞에서 만나기', ['12:18', '12:45'], world.p301)]);
    const card = await getCard(world.friend, invitationOf(invitations, world.friend));
    expect(card.status).toBe(200);
    expect(card.body).toMatchObject({ way: walkingWayOf(date, world) });
  });
});

describe('A meet’s Quest changed at PUT /plans/:questId', () => {
  it('is planned again as a meet with its own Sub Quest left out, and moves to 301동 앞 from 12:18', async () => {
    const date = '2080-01-16';
    const world = await a5(date);
    const making = await made(date, world, '302동 앞', '12:15');
    expect(making.status).toBe(201);
    const { quest } = replySchema.parse(making.body);

    const response = await stage.changePlan(stage.asker, quest.id, {
      input: meetInput(date, [stage.asker.id, world.friend.id]),
      planId: '301동 앞',
      startAt: time(date, '12:18'),
      location: positionOf(world.p301),
    });

    expect(response.status).toBe(200);
    const changed = z.custom<QuestDto>().parse(response.body);
    expect(changed).toMatchObject({ id: quest.id, title: '301동 앞에서 만나기' });
    expect(steps(changed)).toEqual([meetStepOf(date, '301동 앞에서 만나기', ['12:18', '12:45'], world.p301)]);
  });
});

describe('A meet with nobody but the asker', () => {
  // The meet input's own check refuses it before the PLAN_ALONE of a meal with nobody but the asker.
  it('is refused with 400 at the body and makes no Quest', async () => {
    const date = '2080-01-23';
    await stage.asking(date, '12:10');

    const response = await makePlanQuest(stage, {
      input: meetInput(date, [stage.asker.id]),
      planId: '301동 앞',
      startAt: time(date, '12:10'),
      location: null,
    });

    expect(response.status).toBe(400);
    const held = z.array(z.custom<QuestDto>()).parse((await getQuests(stage.app, stage.asker)).body);
    expect(held.filter(({ classQuest }) => !classQuest)).toEqual([]);
  });
});
