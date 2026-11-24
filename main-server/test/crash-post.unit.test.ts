/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-24  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

// Partitions: each field present or missing; tags as pairs, as objects, or not a list; a link on sentry.io, on a
// subdomain, off it, not https, or holding Slack's markup; a signature right, wrong, missing or not hex; the settings
// set, empty or malformed.

import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { settingsSchema } from '../src/common/settings.js';
import { crashPostText, readAlert, signatureHolds } from '../src/sentry-alerts/crash-post.js';

function alertWith(event: unknown): unknown {
  return { action: 'triggered', data: { event, triggered_rule: 'A new crash' } };
}

describe('readAlert', () => {
  it('takes the title, culprit, level, the release_tag and platform tags, and web_url as the link', () => {
    const alert = readAlert(
      alertWith({
        title: 'Error: boom',
        culprit: 'app/index.tsx',
        level: 'fatal',
        tags: [
          ['release_tag', 'v1'],
          ['platform', 'ios'],
        ],
        web_url: 'https://team9.sentry.io/issues/1/',
      }),
    );

    expect(alert).toEqual({
      title: 'Error: boom',
      culprit: 'app/index.tsx',
      level: 'fatal',
      releaseTag: 'v1',
      platform: 'ios',
      link: 'https://team9.sentry.io/issues/1/',
    });
  });

  it('takes tags given as { key, value } too', () => {
    expect(readAlert(alertWith({ tags: [{ key: 'platform', value: 'android' }] })).platform).toBe('android');
  });

  it.each([null, 'text', [], { data: null }, { data: { event: { title: 3, tags: 'release_tag' } } }])(
    'from %j → no field, and no throw',
    (body) => {
      expect(readAlert(body)).toEqual({});
    },
  );

  it.each([
    'https://evil.example/sentry.io/',
    'https://sentry.io.evil.example/issues/1/',
    'http://sentry.io/issues/1/',
    'https://user:pass@sentry.io/issues/1/',
    'javascript:alert(1)',
    'not a url',
  ])('leaves out the link %s', (url) => {
    expect(readAlert(alertWith({ web_url: url })).link).toBeUndefined();
  });
});

describe('crashPostText', () => {
  it('without fields → only the first line', () => {
    expect(crashPostText({})).toBe('App crash: an issue without a title');
  });

  it("puts a title's lines on one line and escapes &, < and >", () => {
    expect(crashPostText({ title: 'a\n<!here>\t& b', culprit: '<@U1>' })).toBe(
      'App crash: `a &lt;!here&gt; &amp; b`\nat `&lt;@U1&gt;`',
    );
  });

  it('writes each part as inline code, so that Slack makes no link of an address or a domain in the words', () => {
    expect(crashPostText({ title: '다시 `로그인`하세요 https://evil.example/x', culprit: 'www.a.example' })).toBe(
      "App crash: `다시 '로그인'하세요 https://evil.example/x`\nat `www.a.example`",
    );
  });

  it('cuts the title to 200 characters, the last one an ellipsis', () => {
    const [line] = crashPostText({ title: '가'.repeat(500) }).split('\n');

    expect(Array.from(line?.replace('App crash: ', '') ?? '')).toHaveLength(202);
    expect(line?.endsWith('…`')).toBe(true);
  });

  it("escapes & in the link's query", () => {
    expect(crashPostText({ link: 'https://sentry.io/issues/1/?a=1&b=2' })).toContain(
      '<https://sentry.io/issues/1/?a=1&amp;b=2|Open the issue in Sentry>',
    );
  });
});

describe('signatureHolds', () => {
  const body = Buffer.from('{"action":"triggered"}');
  const right = createHmac('sha256', 'secret').update(body).digest('hex');

  it.each([
    ['the hex HMAC-SHA256 of the body', right, true],
    ['the same in capitals', right.toUpperCase(), true],
    ['missing', undefined, false],
    ['another secret', createHmac('sha256', 'other').update(body).digest('hex'), false],
    ['not hex', 'g'.repeat(64), false],
    ['too short', right.slice(0, 63), false],
  ])('%s → %s', (_case, signature, holds) => {
    expect(signatureHolds(body, signature, 'secret')).toBe(holds);
  });
});

describe('settingsSchema: the crash alerts', () => {
  const base = settingsSchema.shape;

  it('both unset → empty', () => {
    expect(
      z
        .object({
          SENTRY_WEBHOOK_SECRET: base.SENTRY_WEBHOOK_SECRET,
          APP_CRASH_SLACK_WEBHOOK: base.APP_CRASH_SLACK_WEBHOOK,
        })
        .parse({}),
    ).toEqual({
      SENTRY_WEBHOOK_SECRET: '',
      APP_CRASH_SLACK_WEBHOOK: '',
    });
  });

  it.each(['http://hooks.slack.invalid/T/B/x', 'hooks.slack.invalid/T/B/x'])(
    'a webhook %s → refused, without repeating it',
    (url) => {
      const result = base.APP_CRASH_SLACK_WEBHOOK.safeParse(url);

      expect(result.success).toBe(false);
      expect(JSON.stringify(result.error?.issues)).not.toContain('hooks.slack');
    },
  );
});
