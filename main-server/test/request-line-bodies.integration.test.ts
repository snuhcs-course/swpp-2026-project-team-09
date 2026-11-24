/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { ask, captureLogs, postAssistantMessages } from './assistant.js';
import { getPositions, KEPT_POSITION, keptPositionIn, sharingFriends, uploadPosition } from './location-sharing.js';
import { getProfile, patchProfile } from './profile.js';
import { type LogLine, captureJsonLines, requestLine, useJsonLogs } from './request-logs.js';
import { signInUser } from './friends.js';
import { vehiclesMessage } from './shuttle.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// The routes of src/common/bodiless-routes.ts, each through a request that carries a value the app promises is not
// kept. Its request line is there, with the method, the path, the status and the IDs, and no line holds the value.

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  await useJsonLogs(app);
});

afterAll(async () => {
  await app.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function expectNoBodies(line: LogLine, userId: string): void {
  expect(line).not.toHaveProperty('req_body');
  expect(line).not.toHaveProperty('res_body');
  expect(line).toEqual(expect.objectContaining({ user_id: userId, req_id: expect.any(String) as unknown }));
}

describe('A request whose bodies the log leaves out, about a position', () => {
  it("positions: a Friend's upload and the User's read → neither the coordinates nor the Place in any line", async () => {
    const [viewer, friend] = await sharingFriends(app);
    const logs = captureLogs();
    const { lines } = captureJsonLines();

    await uploadPosition(app, friend, KEPT_POSITION).expect(200);
    const read = await getPositions(app, viewer).expect(200);

    expect(keptPositionIn(read.body)).not.toEqual([]);
    expectNoBodies(await requestLine(lines, 'POST /positions 200'), friend.id);
    expectNoBodies(await requestLine(lines, 'GET /positions 200'), viewer.id);
    expect(keptPositionIn(logs())).toEqual([]);
  });

  it("where the phone is, sent with a late report, a Plan or a Place's lookup → in no line, nor the Place it is at", async () => {
    const { id, accessToken } = await signInUser(app);
    const questId = '65298f3b-0000-4000-8000-00000000000a';
    const logs = captureLogs();
    const { lines } = captureJsonLines();
    const server = app.getHttpServer();

    const late = await withAccessToken(request(server).post(`/quests/${questId}/late`), accessToken).send({
      minutes: 10,
      location: KEPT_POSITION,
    });
    const plan = await withAccessToken(request(server).post('/plans'), accessToken).send({ location: KEPT_POSITION });
    await withAccessToken(request(server).get('/places/at'), accessToken).query(KEPT_POSITION).expect(200);

    expectNoBodies(await requestLine(lines, `POST /quests/${questId}/late ${late.status}`), id);
    expectNoBodies(await requestLine(lines, `POST /plans ${plan.status}`), id);
    expectNoBodies(await requestLine(lines, 'GET /places/at 200'), id);
    expect(keptPositionIn(logs())).toEqual([]);
  });
});

describe('A request whose bodies the log leaves out, about a profile', () => {
  it('the profile: a 학번 and a registered name saved, read, answered by the lobby and refused → in no line', async () => {
    const { id, accessToken } = await signInUser(app);
    const logs = captureLogs();
    const { lines } = captureJsonLines();

    await patchProfile(app, accessToken, { studentNumber: '2026-17391', registeredName: '가짜이름' }).expect(200);
    await getProfile(app, accessToken).expect(200);
    await withAccessToken(request(app.getHttpServer()).post('/lobby'), accessToken).expect(200);
    await patchProfile(app, accessToken, { studentNumber: '2026-1739x', registeredName: '다른가짜' }).expect(400);

    expectNoBodies(await requestLine(lines, 'PATCH /users/me/profile 200'), id);
    expectNoBodies(await requestLine(lines, 'GET /users/me/profile 200'), id);
    expectNoBodies(await requestLine(lines, 'POST /lobby 200'), id);
    expectNoBodies(await requestLine(lines, 'PATCH /users/me/profile 400'), id);
    for (const secret of ['202617391', '2026-17391', '가짜이름', '2026-1739x', '다른가짜']) {
      expect(logs()).not.toContain(secret);
    }
  });
});

describe("The shuttles' positions, of which Production keeps no history", () => {
  it("the worker's Collection, refused, and a User's read → no body on either line, and the vehicle in no line", async () => {
    const { id, accessToken } = await signInUser(app);
    const logs = captureLogs();
    const { lines } = captureJsonLines();

    // Refused for its x, so nothing is stored or sent to the shuttle test's listeners; its body would be logged all the
    // same.
    await request(app.getHttpServer())
      .post('/shuttle/vehicles/collected')
      .auth(inject('settings').WORKER_TOKEN, { type: 'bearer' })
      .send(vehiclesMessage([{ carId: '9137', x: 'made-up', y: 40 }]))
      .expect(400);
    await withAccessToken(request(app.getHttpServer()).get('/shuttle/vehicles'), accessToken).expect(200);

    const collected = await requestLine(lines, 'POST /shuttle/vehicles/collected 400');
    expect(collected).not.toHaveProperty('req_body');
    expect(collected).not.toHaveProperty('res_body');
    expectNoBodies(await requestLine(lines, 'GET /shuttle/vehicles 200'), id);
    expect(logs()).not.toContain('9137');
  });
});

describe('A request whose bodies the log leaves out, the AI behind it', () => {
  it('a timetable picture → none of it in any line', async () => {
    const { id, accessToken } = await signInUser(app);
    const picture = Buffer.from('made-up picture bytes 4e71').toString('base64');
    const logs = captureLogs();
    const { lines } = captureJsonLines();

    const response = await withAccessToken(request(app.getHttpServer()).post('/timetable/readings'), accessToken).send({
      image: picture,
    });

    expectNoBodies(await requestLine(lines, `POST /timetable/readings ${response.status}`), id);
    expect(logs()).not.toContain(picture.slice(0, 16));
  });

  it("the Assistant: the User's message, whether the model answers or not → in no line", async () => {
    const { id, accessToken } = await signInUser(app);
    const logs = captureLogs();
    const { lines } = captureJsonLines();

    const response = await postAssistantMessages(app, accessToken, ask('가짜 비밀 질문 5b2e'));

    expectNoBodies(await requestLine(lines, `POST /assistant/messages ${response.status}`), id);
    expect(logs()).not.toContain('가짜 비밀 질문 5b2e');
  });
});
