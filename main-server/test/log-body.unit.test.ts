/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions of a body: none, a JSON value (object, array, text holding JSON), text that is not JSON, bytes; a field's
// name with or without a secret's word, at the top or deep; short or over the limit.

import { BODY_LIMIT_BYTES, logBody, withoutInviteTokens } from '../src/common/log-body.js';

describe('A JSON body, or none', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty text', ''],
  ])('%s → no body', (_case, body) => {
    expect(logBody(body, 'application/json')).toBeUndefined();
  });

  it('a sign-in and its answer → every token and password is masked, at any depth and in any case', () => {
    const body = {
      idToken: 'made-up-id-token',
      user: { id: 'u-1', session: { accessToken: 'made-up-access', RefreshToken: 'made-up-refresh' } },
      devices: [{ pushToken: 'made-up-push' }],
      administrator: { password: 'made-up-password', clientSecret: 'made-up-secret', Authorization: 'Bearer x' },
    };

    const logged = logBody(body, 'application/json');

    expect(JSON.parse(logged ?? '')).toEqual({
      idToken: '[masked]',
      user: { id: 'u-1', session: { accessToken: '[masked]', RefreshToken: '[masked]' } },
      devices: [{ pushToken: '[masked]' }],
      administrator: { password: '[masked]', clientSecret: '[masked]', Authorization: '[masked]' },
    });
  });

  it('a whole object under a secret name → masked whole', () => {
    expect(logBody({ tokens: { accessToken: 'a', refreshToken: 'b' } }, 'application/json')).toBe(
      '{"tokens":"[masked]"}',
    );
  });

  it('JSON as text, as a response is sent → parsed, masked and written back', () => {
    expect(logBody('{"accessToken":"made-up","title":"점심"}', 'application/json; charset=utf-8')).toBe(
      '{"accessToken":"[masked]","title":"점심"}',
    );
  });

  it('a body with no secret → the same JSON', () => {
    expect(logBody({ title: '점심', at: [126.95, 37.46] }, 'application/json')).toBe(
      '{"title":"점심","at":[126.95,37.46]}',
    );
  });
});

describe('A body to cut', () => {
  it('a body over the limit → cut at the limit, marked, and no character broken', () => {
    const logged = logBody({ text: '가'.repeat(2000) }, 'application/json') ?? '';

    expect(logged.endsWith('…(truncated)')).toBe(true);
    const kept = logged.slice(0, -'…(truncated)'.length);
    expect(Buffer.byteLength(kept)).toBeLessThanOrEqual(BODY_LIMIT_BYTES);
    expect(Buffer.byteLength(kept)).toBeGreaterThan(BODY_LIMIT_BYTES - 3);
    expect(kept).not.toContain('\uFFFD');
  });

  it('a body at the limit → whole', () => {
    const body = { t: 'a'.repeat(BODY_LIMIT_BYTES - '{"t":""}'.length) };

    expect(logBody(body, 'application/json')).toBe(JSON.stringify(body));
  });
});

describe('A body that is not JSON', () => {
  it.each([
    ['bytes', Buffer.alloc(48213), 'multipart/form-data; boundary=x', '[multipart/form-data 48213 bytes]'],
    ['an HTML page', '<html>안녕</html>', 'text/html; charset=utf-8', '[text/html 19 bytes]'],
    ['text that is not JSON', 'not json', 'application/json', '[application/json 8 bytes]'],
    ['bytes with no type', Buffer.alloc(3), undefined, '[unknown type 3 bytes]'],
  ])('%s → its type and size only', (_case, body, type, logged) => {
    expect(logBody(body, type)).toBe(logged);
  });
});

describe('A body nested deeper than the log goes', () => {
  it('20,000 levels of arrays → written without throwing, cut off past 20 levels', () => {
    const body: unknown = JSON.parse(`${'['.repeat(20_000)}${']'.repeat(20_000)}`);

    const logged = logBody(body, 'application/json') ?? '';

    expect(logged).toBe(`${'['.repeat(20)}"[…]"${']'.repeat(20)}`);
  });
});

describe('An Invite Link token', () => {
  it.each([
    ['an Invite Link read', '/invite-links/made-up-token', '/invite-links/[masked]'],
    ['an Invite Link accepted', '/invite-links/made-up-token/accept', '/invite-links/[masked]/accept'],
    ["the link's page", '/invite/made-up-token', '/invite/[masked]'],
    ['an address', 'https://snunow.example/invite/made-up-token', 'https://snunow.example/invite/[masked]'],
    ['a new Invite Link', '/invite-links', '/invite-links'],
  ])('in %s → masked', (_case, text, written) => {
    expect(withoutInviteTokens(text)).toBe(written);
  });

  it("in a body's text → masked", () => {
    expect(logBody({ url: 'https://snunow.example/invite/made-up-token' }, 'application/json')).toBe(
      '{"url":"https://snunow.example/invite/[masked]"}',
    );
  });
});
