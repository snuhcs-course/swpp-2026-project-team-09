/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { type TestUser } from './friends.js';
import { expectStatus, OFF_CAMPUS, setMasterSwitch, uploadPosition } from './location-sharing.js';
import {
  minsuSceneOf,
  minsuWayOf,
  type Places,
  pointOf,
  positionOf,
  positionsIn,
  key,
  stepOf,
} from './invitation-card.js';
import { MealPlanStage, type Named } from './meal-plan.js';
import { answerInvitation, invitationOf } from './quest-recruiting.js';
import { ownQuest, subQuestIn } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { ANY_STRING, refused, SignalWatcher, signalsWhile } from './signals.js';

// The invitation's card at GET /quest-invitations/:id over the started server: the Leader makes the Quest of the
// worked example by hand, invites a Friend, and the Friend reads their own way. Each test stands on a Tuesday of April
// to June 2088, which no other file uses, at 11:50.

const stage = new MealPlanStage();
let watcher: SignalWatcher;

beforeAll(async () => {
  await stage.start();
  watcher = await SignalWatcher.start();
});

afterAll(async () => {
  await watcher.stop();
  await stage.stop();
});

function getCard(user: TestUser, invitationId: string, location?: object): request.Test {
  return withAccessToken(
    request(stage.app.getHttpServer()).get(`/quest-invitations/${invitationId}`),
    user.accessToken,
  ).query(location ?? {});
}

const time = (date: string, clock: string): string => `${date}T${clock}:00+09:00`;

// The Leader's Quest of the worked example: the meeting at 301동 from 12:18, then the meal at the Student Center from
// 12:33, 15 minutes on. The Friend is invited into it.
async function lunchFor(date: string, friend: Named): Promise<{ questId: string; invitationId: string }> {
  const [p301, p63] = [await stage.numbered('301'), await stage.numbered('63')];
  const questId = await ownQuest(stage.app, stage.asker, {
    title: '점심',
    subQuest: {
      title: '유상, 민수: 301동 앞에서 만나기',
      startsAt: time(date, '12:18'),
      endsAt: time(date, '12:33'),
      place: { placeId: p301.id },
    },
  });
  await subQuestIn(stage.app, stage.asker, questId, {
    title: '학생회관식당에서 식사',
    startsAt: time(date, '12:33'),
    endsAt: time(date, '12:55'),
    place: { placeId: p63.id },
  });
  return { questId, invitationId: await invitationOf(stage.app, stage.asker, questId, friend) };
}

// 민수, whose Class in 302동 ends at 12:15, invited into the worked example's lunch.
async function minsuInvited(date: string): Promise<{ minsu: Named; questId: string; invitationId: string }> {
  await stage.asking(date, '11:50');
  const minsu = await stage.friend('민수');
  await stage.classAt(minsu, '11:00', '12:15', '302');
  return { minsu, ...(await lunchFor(date, minsu)) };
}

// A Friend with no Class all morning, invited into the worked example's lunch.
async function freeFriendInvited(date: string): Promise<{ friend: Named; invitationId: string }> {
  await stage.asking(date, '11:50');
  const friend = await stage.friend('지은');
  const { invitationId } = await lunchFor(date, friend);
  return { friend, invitationId };
}

const placesOf = async (): Promise<Places> => ({
  p301: await stage.numbered('301'),
  p302: await stage.numbered('302'),
  p63: await stage.numbered('63'),
});

const questOf = (questId: string): object => ({
  quest: {
    id: questId,
    title: '점심',
    globalEvent: null,
    leader: { id: stage.asker.id, name: '유상', department: '컴퓨터공학부' },
    holderCount: 1,
    capacity: 4,
    joinPolicy: 'closed',
    board: null,
    description: '',
    createdAt: ANY_STRING,
  },
  holders: [{ id: stage.asker.id, name: '유상' }],
});

describe('The card of the worked example', () => {
  it('gives 민수 the Quest, its steps, and his way through 301동', async () => {
    const { minsu, questId, invitationId } = await minsuInvited('2088-04-06');
    const places = await placesOf();

    const response = await getCard(minsu, invitationId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: invitationId,
      sentAt: ANY_STRING,
      ...questOf(questId),
      steps: [
        stepOf(
          '유상, 민수: 301동 앞에서 만나기',
          ['2088-04-06T03:18:00.000Z', '2088-04-06T03:33:00.000Z'],
          places.p301,
        ),
        stepOf('학생회관식당에서 식사', ['2088-04-06T03:33:00.000Z', '2088-04-06T03:55:00.000Z'], places.p63),
      ],
      gathering: {
        place: pointOf(places.p63, '63동'),
        startAt: '2088-04-06T12:33:00+09:00',
        endAt: '2088-04-06T12:55:00+09:00',
      },
      way: { ...minsuWayOf(places), scene: minsuSceneOf(minsu, places) },
    });
  });
});

describe("The request's location", () => {
  it('is where a Friend free all morning sets out from, on campus', async () => {
    const { friend, invitationId } = await freeFriendInvited('2088-04-13');
    const p301 = await stage.numbered('301');

    const response = await getCard(friend, invitationId, positionOf(p301)).expect(200);

    expect(response.body).toMatchObject({
      way: {
        status: 'ok',
        origin: { place: { placeId: p301.id }, basis: 'location' },
        leaveAt: '2088-04-13T12:18:00+09:00',
        walkMinutes: 15,
        scene: { people: [{ at: positionOf(p301), source: 'exact' }] },
      },
    });
  });

  it('left out leaves the way of a Friend free all morning unknown', async () => {
    const { friend, invitationId } = await freeFriendInvited('2088-04-20');

    const response = await getCard(friend, invitationId).expect(200);

    expect(response.body).toMatchObject({ way: { status: 'unknown', origin: null, lines: [], scene: { people: [] } } });
  });

  it('off campus tells a Friend free all morning that no way can be drawn', async () => {
    const { friend, invitationId } = await freeFriendInvited('2088-04-27');

    const response = await getCard(friend, invitationId, OFF_CAMPUS).expect(200);

    expect(response.body).toMatchObject({
      way: { status: 'off-campus', origin: null, lines: [[{ text: '캠퍼스 밖이라 길은 그리지 못해요.' }]] },
    });
  });

  it('gives way to the Class right before', async () => {
    const { minsu, invitationId } = await minsuInvited('2088-05-04');
    const [p63, p302] = [await stage.numbered('63'), await stage.numbered('302')];

    const response = await getCard(minsu, invitationId, positionOf(p63)).expect(200);

    expect(response.body).toMatchObject({ way: { origin: { place: { placeId: p302.id }, basis: 'timetable' } } });
  });
});

describe('A location of one number', () => {
  it('is refused', async () => {
    const { minsu, invitationId } = await minsuInvited('2088-06-15');

    expect((await getCard(minsu, invitationId, { latitude: 37.45 })).status).toBe(400);
  });
});

describe('Anyone but the invited User', () => {
  it('is answered 404, the Leader included', async () => {
    const { invitationId } = await minsuInvited('2088-05-11');
    const other = await stage.friend('지은');

    const responses = await Promise.all([stage.asker, other].map((user) => getCard(user, invitationId)));

    expect(responses.map(({ body }) => body as unknown)).toEqual([
      expect.objectContaining(refused(404, 'QUEST_INVITATION_NOT_FOUND')),
      expect.objectContaining(refused(404, 'QUEST_INVITATION_NOT_FOUND')),
    ]);
  });
});

describe('An invitation already answered', () => {
  it('is answered 404 once accepted', async () => {
    const { minsu, invitationId } = await minsuInvited('2088-05-18');
    await answerInvitation(stage.app, minsu, invitationId, 'accept').expect(201);

    expect((await getCard(minsu, invitationId)).body).toMatchObject(refused(404, 'QUEST_INVITATION_NOT_FOUND'));
  });

  it('is answered 404 once declined', async () => {
    const { minsu, invitationId } = await minsuInvited('2088-05-25');
    await answerInvitation(stage.app, minsu, invitationId, 'decline').expect(204);

    expect((await getCard(minsu, invitationId)).body).toMatchObject(refused(404, 'QUEST_INVITATION_NOT_FOUND'));
  });
});

describe('Reading the card', () => {
  it('sends no signal to the invitee or the Leader', async () => {
    const { minsu, invitationId } = await minsuInvited('2088-06-01');
    const p302 = await stage.numbered('302');
    // Lets the invitation's own signals arrive first.
    await signalsWhile(stage.app, watcher, 'quests-changed', () => Promise.resolve());
    const before = [watcher.for(minsu).length, watcher.for(stage.asker).length];

    await signalsWhile(stage.app, watcher, 'quests-changed', () =>
      getCard(minsu, invitationId, positionOf(p302)).expect(200),
    );

    expect([watcher.for(minsu).length, watcher.for(stage.asker).length]).toEqual(before);
  });

  it("holds no position but the invitee's own and the Places of their way", async () => {
    const date = '2088-06-08';
    const { friend, invitationId } = await freeFriendInvited(date);
    await stage.classAt(stage.asker, '13:00', '13:50', '24');
    await expectStatus(setMasterSwitch(stage.app, stage.asker, true), 204);
    await expectStatus(setMasterSwitch(stage.app, friend, true), 204);
    await expectStatus(uploadPosition(stage.app, stage.asker), 200);
    const mine = { latitude: 37.45015, longitude: 126.9526 };
    const [p301, p63] = [await stage.numbered('301'), await stage.numbered('63')];

    const response = await getCard(friend, invitationId, mine).expect(200);

    expect(positionsIn(response.body)).toEqual(
      new Set([mine, positionOf(p301), positionOf(p63)].map((each) => key(each))),
    );
  });
});
