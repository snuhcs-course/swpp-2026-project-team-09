/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';
import { cutMessage, MESSAGE_LIMIT, scrubBreadcrumb, scrubEvent, scrubPath, scrubUrl } from '@/telemetry/scrub';

// What is taken out of a report before it leaves the phone: URLs, breadcrumbs, messages and the User.

const QUEST = '3f2a1c9e-8b7d-4e6f-9a0b-1c2d3e4f5a6b';

describe('scrubUrl', () => {
  it('drops the query string and the fragment', () => {
    expect(scrubUrl('https://api.snunow.com/places?kind=study#top')).toBe('https://api.snunow.com/places');
  });

  it('leaves no coordinate of a query behind', () => {
    const scrubbed = scrubUrl('https://api.snunow.com/places/nearby?lat=37.45&lng=126.95');

    expect(scrubbed).toBe('https://api.snunow.com/places/nearby');
    expect(scrubbed).not.toMatch(/37|126|lat|lng/u);
  });

  it('turns a UUID segment and a number segment into :id', () => {
    expect(scrubUrl(`https://api.snunow.com/quests/${QUEST}/members/42`)).toBe(
      'https://api.snunow.com/quests/:id/members/:id',
    );
  });

  it('turns a coordinate in a path into :id', () => {
    expect(scrubUrl('/route/37.4602/-126.9519')).toBe('/route/:id/:id');
  });

  it('keeps a path with no id as it is', () => {
    expect(scrubUrl('/me/friends/requests')).toBe('/me/friends/requests');
  });

  it('keeps no Friend ID a User typed, which is letters and digits and no UUID', () => {
    expect(scrubUrl('https://api.snunow.com/friend-ids/K7M3XQ9A')).toBe('https://api.snunow.com/friend-ids/:id');
  });

  it("keeps no Invite Link's token, which opens the link for a day", () => {
    const token = 'q3J_8dZk-0aVb1Yx7mN2pLr5sT9uWc4eHf6gIjKlMnO';
    expect(scrubUrl(`/invite-links/${token}`)).toBe('/invite-links/:id');
    expect(scrubUrl(`/invite-links/${token}/accept`)).toBe('/invite-links/:id/accept');
  });

  it('keeps only route words: a segment with a capital, a digit, a dot or an escape is a value', () => {
    expect(scrubUrl('/places/301/menus/Lunch/v2/%EC%8B%9D%EB%8B%B9/a.b')).toBe('/places/:id/menus/:id/:id/:id/:id');
    expect(scrubUrl('/quest-invitations/sent')).toBe('/quest-invitations/sent');
  });

  it('keeps the host, also an address with digits in it', () => {
    expect(scrubUrl('http://swpp26t09.147-46-242-174.sslip.io/lobby?x=1')).toBe(
      'http://swpp26t09.147-46-242-174.sslip.io/lobby',
    );
  });
});

describe('scrubPath', () => {
  it('gives the scrubbed path without the scheme and the host', () => {
    expect(scrubPath(`https://api.snunow.com/rooms/${QUEST}?since=2026-11-24`)).toBe('/rooms/:id');
    expect(scrubPath('https://api.snunow.com?x=1')).toBe('/');
  });
});

describe('cutMessage', () => {
  it(`cuts a message to ${MESSAGE_LIMIT} characters and leaves a shorter one`, () => {
    expect(cutMessage('가'.repeat(500))).toHaveLength(MESSAGE_LIMIT);
    expect(cutMessage('짧은 메시지')).toBe('짧은 메시지');
  });
});

describe('scrubBreadcrumb', () => {
  it('drops a console breadcrumb', () => {
    expect(scrubBreadcrumb({ category: 'console', message: '홍길동 2026-12345', level: 'log' })).toBeNull();
  });
});

describe('scrubBreadcrumb of a request', () => {
  it('keeps of a request only its method, its scrubbed path and its status', () => {
    const fetch: Breadcrumb = {
      type: 'http',
      category: 'fetch',
      level: 'info',
      timestamp: 1,
      message: 'GET https://api.snunow.com/places/nearby?lat=37.45&lng=126.95',
      data: {
        method: 'GET',
        url: 'https://api.snunow.com/places/nearby?lat=37.45&lng=126.95',
        status_code: 200,
        request_body_size: 12,
        response_body_size: 300,
        'http.query': '?lat=37.45&lng=126.95',
      },
    };

    const scrubbed = scrubBreadcrumb(fetch);

    expect(scrubbed).toEqual({
      type: 'http',
      category: 'fetch',
      level: 'info',
      timestamp: 1,
      data: { method: 'GET', url: '/places/nearby', status_code: 200 },
    });
    expect(JSON.stringify(scrubbed)).not.toMatch(/37\.45|126\.95/u);
  });

  it('scrubs an xhr breadcrumb as a request too', () => {
    expect(
      scrubBreadcrumb({ category: 'xhr', data: { method: 'POST', url: `/quests/${QUEST}/join`, status_code: 409 } }),
    ).toMatchObject({ data: { method: 'POST', url: '/quests/:id/join', status_code: 409 } });
  });
});

describe('scrubBreadcrumb of another breadcrumb', () => {
  it("cuts another breadcrumb's message and scrubs the URLs in its data", () => {
    const scrubbed = scrubBreadcrumb({
      category: 'navigation',
      message: 'x'.repeat(300),
      data: { from: `/room/${QUEST}?tab=plan`, to: 'https://snunow.com/invite/42', count: 3 },
    });

    expect(scrubbed?.message).toHaveLength(MESSAGE_LIMIT);
    expect(scrubbed?.data).toEqual({ from: '/room/:id', to: 'https://snunow.com/invite/:id', count: 3 });
  });
});

describe('scrubEvent', () => {
  const event: ErrorEvent = {
    type: undefined,
    message: 'm'.repeat(250),
    exception: { values: [{ type: 'Error', value: 'e'.repeat(250) }] },
    request: {
      method: 'GET',
      url: `https://api.snunow.com/quests/${QUEST}?lat=37.45&lng=126.95`,
      query_string: 'lat=37.45&lng=126.95',
      cookies: { session: 'abc' },
      headers: { Authorization: 'Bearer abc' },
    },
    breadcrumbs: [
      { category: 'console', message: 'secret' },
      { type: 'http', category: 'fetch', data: { method: 'GET', url: '/me?lat=37.45', status_code: 200 } },
    ],
    user: { id: 'user-uuid', email: 'someone@snu.ac.kr', username: '홍길동', ip_address: '1.2.3.4' },
    contexts: { device: { name: '홍길동의 iPhone', model: 'iPhone15,2' }, os: { name: 'iOS' } },
    server_name: '홍길동의 iPhone',
    tags: { where: 'screen' },
  };

  it('cuts the messages, scrubs the request and the breadcrumbs, and keeps the User as the id alone', () => {
    const scrubbed = scrubEvent(event);

    expect(scrubbed.message).toHaveLength(MESSAGE_LIMIT);
    expect(scrubbed.exception?.values?.[0]?.value).toHaveLength(MESSAGE_LIMIT);
    expect(scrubbed.request).toEqual({ method: 'GET', url: 'https://api.snunow.com/quests/:id' });
    expect(scrubbed.breadcrumbs).toEqual([
      { type: 'http', category: 'fetch', data: { method: 'GET', url: '/me', status_code: 200 } },
    ]);
    expect(scrubbed.user).toEqual({ id: 'user-uuid' });
    expect(scrubbed.contexts).toEqual({ device: { model: 'iPhone15,2' }, os: { name: 'iOS' } });
    expect(scrubbed.server_name).toBeUndefined();
    expect(scrubbed.tags).toEqual({ where: 'screen' });
    expect(JSON.stringify(scrubbed)).not.toMatch(/37\.45|126\.95|홍길동|snu\.ac\.kr|Bearer/u);
  });

  it('leaves out a User without an id', () => {
    expect(scrubEvent({ type: undefined, user: { email: 'someone@snu.ac.kr' } }).user).toBeUndefined();
  });

  it('leaves the event it was given as it was', () => {
    const copy = structuredClone(event);
    scrubEvent(event);
    expect(event).toEqual(copy);
  });
});
