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

describe('A request whose bodies the log leaves out, about a person', () => {
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
