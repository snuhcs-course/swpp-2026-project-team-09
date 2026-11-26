/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication, Logger } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { captureLogs } from './assistant.js';
import { putConsent } from './consent.js';
import { signInUser, type TestUser } from './friends.js';
import { makeQuest } from './quests.js';
import { startApp } from './start-app.js';
import { PostHogStub, POSTHOG_TOKEN, settle, usageSettings } from './usage.js';

// A PostHog that fails, through the started server and a stand-in for PostHog's client: the request's answer is as it
// would have been, and the one warning names the error's type, never the token or the error's message.

const posthog = new PostHogStub();
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(
    { ...inject('settings'), ...usageSettings },
    [],
    undefined,
    undefined,
    [],
    undefined,
    undefined,
    {
      posthog: posthog.clients,
    },
  );
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  posthog.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function chooser(): Promise<TestUser> {
  const user = await signInUser(app);
  await putConsent(app, user.accessToken, { version: 1, usage: true }).expect(204);
  return user;
}

const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const party = { title: '저녁 같이 먹어요', subQuest: { title: '저녁', startsAt } };

// An error whose message quotes the token, as a request's error could.
function quoting(name: string, cause?: Error): Error {
  const error = new Error(`POST https://us.i.posthog.com/batch?token=${POSTHOG_TOKEN} failed`, { cause });
  error.name = name;
  return error;
}

function timeoutError(): Error {
  const error = new Error(`Capture V1 request timed out after 5000ms for ${POSTHOG_TOKEN}`);
  error.name = 'AbortError';
  return error;
}

describe.each([
  [
    'throws',
    (): void => {
      posthog.throws(quoting('TypeError'));
    },
    'TypeError',
  ],
  [
    'reports a timeout of its request',
    (): void => {
      posthog.reports(quoting('CaptureError', timeoutError()));
    },
    'CaptureError (AbortError)',
  ],
])('A PostHog that %s', (_case, fail, type) => {
  it('leaves the answer as it was and logs one warning naming the error type, without the token or the message', async () => {
    const user = await chooser();
    fail();
    const logs = captureLogs();
    const warn = vi.spyOn(Logger.prototype, 'warn');

    const response = await makeQuest(app, user, party);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ title: '저녁 같이 먹어요', leader: { id: user.id } });
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith(`A usage event was not sent to PostHog: ${type}`);
    });
    await settle();
    expect(warn.mock.calls.filter(([line]) => String(line).includes('PostHog'))).toHaveLength(1);
    expect(logs()).not.toContain(POSTHOG_TOKEN);
    expect(logs()).not.toContain('us.i.posthog.com');
  });
});

describe('A PostHog that does not answer', () => {
  it('adds nothing to the request: the answer comes as it would have, and the event is still waiting', async () => {
    const user = await chooser();
    posthog.hangs();

    const response = await makeQuest(app, user, party);

    expect(response.status).toBe(201);
    await vi.waitFor(() => {
      expect(posthog.of(user.id)).toHaveLength(1);
    });
    // A second request is answered while the first event still waits.
    expect((await makeQuest(app, user, party)).status).toBe(201);
  });
});
