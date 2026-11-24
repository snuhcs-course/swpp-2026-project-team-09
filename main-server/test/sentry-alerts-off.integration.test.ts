/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { crashAlertSettings, issueAlert, postAlert, settle, SlackStub } from './sentry-alerts.js';
import { startApp } from './start-app.js';

const slack = new SlackStub();

// Each case starts an app of its own in a hook, whose timeout allows a start.
describe.each([
  ['neither setting', { SENTRY_WEBHOOK_SECRET: undefined, APP_CRASH_SLACK_WEBHOOK: undefined }],
  ['no webhook', { ...crashAlertSettings, APP_CRASH_SLACK_WEBHOOK: '' }],
  ['no secret', { ...crashAlertSettings, SENTRY_WEBHOOK_SECRET: '' }],
])('Crash alerts with %s', (_case, values) => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    slack.reset();
    const settings = { ...inject('settings'), ...values };
    app = await startApp(settings, [], undefined, undefined, [], undefined, undefined, { fetchSlack: slack.fetch });
  });

  afterAll(async () => {
    await app.close();
  });

  it('→ the server starts, the route answers 404 and nothing is posted', async () => {
    const response = await postAlert(app, JSON.stringify(issueAlert()));

    expect(response.status).toBe(404);
    await settle();
    expect(slack.posts).toEqual([]);
  });
});
