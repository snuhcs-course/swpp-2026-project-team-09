/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The 학번 and the registered name are the User's own: every reply that shows the User to another User leaves them
// out, and the profile's routes never write them to the log.

import { INestApplication, Logger } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import {
  answerFriendRequest,
  befriend,
  getFriendRequests,
  getFriends,
  lookUpFriendId,
  requestFriendship,
  signInUser,
  TestUser,
} from './friends.js';
import { answerInvitation, getInvitations, getMyParty, invitationOf, partyOf } from './parties.js';
import { getProfile, patchProfile } from './profile.js';
import { askToJoin, getInvitations as getQuestInvitations, getJoinRequests, invite } from './quest-recruiting.js';
import { getQuest, getQuests, getRecruitingQuests, joinQuest, ownQuest } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

const STUDENT_NUMBER = '202612345';
const REGISTERED_NAME = '김비밀';
const SECRETS = [STUDENT_NUMBER, '2026-12345', REGISTERED_NAME];

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// A User named 홍길동 who has entered the library's details, and another User, 김철수, who meets them.
async function holderAndViewer(): Promise<[TestUser, TestUser]> {
  const [holder, viewer] = await Promise.all([
    signInUser(app, { name: '홍길동', department: '컴퓨터공학부' }),
    signInUser(app, { name: '김철수', department: '경영학과' }),
  ]);
  const saved = await patchProfile(app, holder.accessToken, {
    studentNumber: '2026-12345',
    registeredName: REGISTERED_NAME,
    affiliation: 'exchange',
  });
  expect(saved.body).toMatchObject({ studentNumber: STUDENT_NUMBER, registeredName: REGISTERED_NAME });
  return [holder, viewer];
}

// The reply shows the holder, by their name, and neither of the two details nor their fields.
function expectShownWithoutDetails(response: request.Response): void {
  const body = JSON.stringify(response.body);
  expect(response.status).toBeLessThan(300);
  expect(body).toContain('홍길동');
  for (const secret of SECRETS) {
    expect(body).not.toContain(secret);
  }
  expect(body).not.toMatch(/studentNumber|registeredName|affiliation/u);
}

describe("Another User's view of a User with a 학번 and a registered name", () => {
  it('leaves them out of the Friend search, the Friend Requests and the Friend list', async () => {
    const [holder, viewer] = await holderAndViewer();

    expectShownWithoutDetails(await lookUpFriendId(app, viewer.accessToken, holder.friendId));
    const requestId = await requestFriendship(app, holder, viewer);
    expectShownWithoutDetails(await getFriendRequests(app, viewer));
    await answerFriendRequest(app, viewer, requestId, 'accept');
    expectShownWithoutDetails(await getFriends(app, viewer));
  });

  it('leaves them out of the Quests, their join requests and their invitations', async () => {
    const [holder, viewer] = await holderAndViewer();
    await befriend(app, holder, viewer);
    const recruiting = await ownQuest(app, holder, { title: '홍길동의 퀘스트', joinPolicy: 'open' });
    const invitedTo = await ownQuest(app, holder, { title: '초대 퀘스트' });
    const approval = await ownQuest(app, viewer, { title: '승인 퀘스트', joinPolicy: 'approval' });

    expectShownWithoutDetails(await getRecruitingQuests(app, viewer));
    expect((await joinQuest(app, viewer, recruiting)).status).toBe(201);
    expectShownWithoutDetails(await getQuest(app, viewer, recruiting));
    expectShownWithoutDetails(await getQuests(app, viewer));
    expect((await askToJoin(app, holder, approval)).status).toBe(201);
    expectShownWithoutDetails(await getJoinRequests(app, viewer, approval));
    expect((await invite(app, holder, invitedTo, viewer.id)).status).toBeLessThan(300);
    expectShownWithoutDetails(await getQuestInvitations(app, viewer));
  });

  it('leaves them out of a Party and its invitation', async () => {
    const [holder, viewer] = await holderAndViewer();
    await befriend(app, holder, viewer);
    await partyOf(app, holder, { joinPolicy: 'closed' });

    const invitationId = await invitationOf(app, holder, viewer);
    expectShownWithoutDetails(await getInvitations(app, viewer));
    await answerInvitation(app, viewer, invitationId, 'accept');
    expectShownWithoutDetails(await getMyParty(app, viewer));
  });
});

// Everything written to the server's log, to the console and to the process's output, from now on.
function captureLogs(): () => string {
  const spies = [
    ...(['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const).map((level) =>
      vi.spyOn(Logger.prototype, level),
    ),
    ...(['log', 'warn', 'error', 'info', 'debug'] as const).map((level) => vi.spyOn(console, level)),
    vi.spyOn(process.stdout, 'write'),
    vi.spyOn(process.stderr, 'write'),
  ];
  return () =>
    spies
      .flatMap((spy) => {
        const values: unknown[] = spy.mock.calls.flat();
        return values;
      })
      .map((value) => (value instanceof Error ? `${value.message} ${value.stack}` : JSON.stringify(value)))
      .join('\n');
}

describe("The profile's routes", () => {
  it('write neither the 학번 nor the registered name to the log, saved or refused', async () => {
    const { accessToken } = await signInUser(app);
    const logs = captureLogs();

    await patchProfile(app, accessToken, { studentNumber: '2026-12345', registeredName: REGISTERED_NAME });
    await getProfile(app, accessToken);
    await withAccessToken(request(app.getHttpServer()).post('/lobby'), accessToken);
    const refused = await patchProfile(app, accessToken, { studentNumber: '2026-1234x', registeredName: '김비밀김' });

    expect(refused.status).toBe(400);
    const written = logs();
    for (const secret of [...SECRETS, '2026-1234x', '김비밀김']) {
      expect(written).not.toContain(secret);
    }
  });
});
