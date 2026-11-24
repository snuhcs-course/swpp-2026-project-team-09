/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { captureLogs } from './assistant.js';
import { crashAlertSettings, issueAlert, postAlert, SENTRY_SECRET, SLACK_WEBHOOK, SlackStub } from './sentry-alerts.js';
import { startApp } from './start-app.js';

const slack = new SlackStub();
let app: INestApplication<Server>;

beforeAll(async () => {
  const settings = { ...inject('settings'), ...crashAlertSettings };
  app = await startApp(settings, [], undefined, undefined, [], undefined, undefined, { fetchSlack: slack.fetch });
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  slack.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const body = JSON.stringify(issueAlert());

// Whether neither secret, nor any part of the webhook's address, is in the text.
function holdsNoSecret(text: string): boolean {
  return ![SENTRY_SECRET, SLACK_WEBHOOK, 'hooks.slack.invalid', '/T/B/x'].some((secret) => text.includes(secret));
}

async function logged(logs: () => string, line: string): Promise<void> {
  await vi.waitFor(() => {
    expect(logs()).toContain(line);
  });
}

describe('A Slack that fails', () => {
  it.each([
    ['answers 500', 500, 'Slack answered 500'],
    ['answers 404', 404, 'Slack answered 404'],
    [
      'does not answer within 5 seconds',
      new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
      'Slack did not answer within 5 seconds',
    ],
    [
      'fails with an error that quotes the webhook',
      new TypeError(`fetch failed: getaddrinfo ENOTFOUND ${SLACK_WEBHOOK}`),
      'the request to Slack failed (TypeError)',
    ],
  ])('%s → Sentry answered 200, one warning without the webhook, no retry', async (_case, outcome, cause) => {
    if (typeof outcome === 'number') {
      slack.answers(outcome);
    } else {
      slack.fails(outcome);
    }
    const logs = captureLogs();

    const response = await postAlert(app, body);

    expect(response.status).toBe(200);
    await logged(logs, `A crash alert from Sentry was not posted to Slack: ${cause}`);
    expect(slack.posts).toHaveLength(1);
    expect(holdsNoSecret(logs())).toBe(true);
  });
});

describe('The cap of 10 posts a minute', () => {
  it('drops the eleventh alert in a minute, and counts it in one warning once the minute is over', async () => {
    // Imported after the app started, so that it is the class the app registered.
    const { CrashAlertsService } = await import('../src/sentry-alerts/crash-alerts.service.js');
    const now = vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date('2026-11-24T03:00:10Z'));
    const logs = captureLogs();

    const answers = await Promise.all(Array.from({ length: 12 }, async () => (await postAlert(app, body)).status));

    expect(answers).toEqual(Array.from({ length: 12 }, () => 200));
    await vi.waitFor(() => {
      expect(slack.posts).toHaveLength(10);
    });
    expect(logs()).not.toContain('were not posted');

    now.mockReturnValue(new Date('2026-11-24T03:01:05Z'));
    app.get(CrashAlertsService).reportDropped();

    expect(logs()).toContain(
      '2 crash alerts from Sentry were not posted to Slack in the minute from 2026-11-24T03:00:00.000Z: over 10 a minute',
    );
    expect((await postAlert(app, body)).status).toBe(200);
    await vi.waitFor(() => {
      expect(slack.posts).toHaveLength(11);
    });
    expect(logs().match(/were not posted/gu)).toHaveLength(1);
  });
});

describe('The secrets', () => {
  it('appear in no log line and no answer, whether the alert was taken or refused', async () => {
    const logs = captureLogs();
    slack.answers(500);

    const answers = [
      await postAlert(app, body),
      await postAlert(app, body, { signature: null }),
      await postAlert(app, 'not json'),
    ];

    await logged(logs, 'Slack answered 500');
    const answered = answers.map(({ status, text, headers }) => `${status} ${text} ${JSON.stringify(headers)}`);
    expect(holdsNoSecret(answered.join('\n'))).toBe(true);
    expect(holdsNoSecret(logs())).toBe(true);
  });
});
