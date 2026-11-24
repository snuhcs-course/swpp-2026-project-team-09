/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-24  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { captureLogs } from './assistant.js';
import { crashAlertSettings, issueAlert, postAlert, settle, sign, SLACK_WEBHOOK, SlackStub } from './sentry-alerts.js';
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

async function postsMade(count: number): Promise<void> {
  await vi.waitFor(() => {
    expect(slack.posts).toHaveLength(count);
  });
}

const LINK =
  '<https://sentry.io/organizations/test-org/issues/1117540176/events/e4874d664c3540c1a32eab185f12c5ab/|Open the issue in Sentry>';

describe('A signed issue alert from Sentry', () => {
  it('→ 200, and one post to the webhook with the title, culprit, level, release tag, platform and link', async () => {
    const response = await postAlert(app, JSON.stringify(issueAlert()));

    expect(response.status).toBe(200);
    await postsMade(1);
    expect(slack.posts).toEqual([
      {
        url: SLACK_WEBHOOK,
        timeout: true,
        text: [
          "App crash: TypeError: Cannot read property 'x' of undefined",
          'at app/(tabs)/index.tsx · level error · release snunow/all/26.11.24-1 · platform android',
          LINK,
        ].join('\n'),
      },
    ]);
  });

  it('posts no stack, user, breadcrumb, request or other tag', async () => {
    await postAlert(app, JSON.stringify(issueAlert()));

    await postsMade(1);
    const text = String(slack.posts[0]?.text);
    for (const kept of ['secret-stack-frame', '3f2c1b7e', 'breadcrumb', 'token=abc', 'handled']) {
      expect(text).not.toContain(kept);
    }
  });

  it("escapes Slack's markup and cuts the title to 200 characters", async () => {
    const title = `<!channel> & <@U123> ${'x'.repeat(300)}`;

    await postAlert(app, JSON.stringify(issueAlert({ title, culprit: '<https://evil.example|click>' })));

    await postsMade(1);
    const [first, second] = String(slack.posts[0]?.text).split('\n');
    expect(first).toBe(`App crash: \`&lt;!channel&gt; &amp; &lt;@U123&gt; ${'x'.repeat(178)}…\``);
    expect(second).toContain('at `&lt;https://evil.example|click&gt;`');
  });
});

describe('A signed issue alert, read tolerantly', () => {
  it('with a link off sentry.io, or not https → posted without a link', async () => {
    await postAlert(app, JSON.stringify(issueAlert({ web_url: 'https://sentry.io.evil.example/issues/1/' })));
    await postAlert(app, JSON.stringify(issueAlert({ web_url: 'http://sentry.io/issues/1/' })));

    await postsMade(2);
    for (const { text } of slack.posts) {
      expect(String(text)).not.toContain('<http');
    }
  });

  it('with no event fields → 200, and a shorter post', async () => {
    const response = await postAlert(app, JSON.stringify({ action: 'triggered', data: {} }));

    expect(response.status).toBe(200);
    await postsMade(1);
    expect(slack.posts[0]?.text).toBe('App crash: an issue without a title');
  });

  it('of another resource, or not JSON → 200, and nothing posted', async () => {
    const logs = captureLogs();

    const other = await postAlert(app, JSON.stringify({ action: 'created' }), { resource: 'installation' });
    const notJson = await postAlert(app, 'not json');

    expect([other.status, notJson.status]).toEqual([200, 200]);
    expect(logs()).toContain('A crash alert from Sentry was not posted to Slack: its body is not JSON');
    await settle();
    expect(slack.posts).toEqual([]);
  });
});

describe('An alert refused', () => {
  const body = JSON.stringify(issueAlert());

  it.each([
    ['no signature', null],
    ['a signature with another secret', sign(body, 'another-secret')],
    ['a signature that is not hex', 'z'.repeat(64)],
    ['a short signature', sign(body).slice(0, 32)],
  ])('with %s → 401, and nothing posted', async (_case, signature) => {
    const response = await postAlert(app, body, { signature });

    expect(response.status).toBe(401);
    await settle();
    expect(slack.posts).toEqual([]);
  });

  it('with a body changed after signing → 401, and nothing posted', async () => {
    const changed = body.replace('level', 'leveL');

    const response = await postAlert(app, changed, { signature: sign(body) });

    expect(response.status).toBe(401);
    await settle();
    expect(slack.posts).toEqual([]);
  });

  it('with the same JSON written otherwise than it was signed → 401, since the bytes are what is signed', async () => {
    const respaced = JSON.stringify(issueAlert(), null, 2);

    const response = await postAlert(app, respaced, { signature: sign(body) });

    expect(response.status).toBe(401);
  });
});
