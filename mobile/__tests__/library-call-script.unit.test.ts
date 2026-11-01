/**
 * @jest-environment jsdom
 */
/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { CALL_SCRIPT, type LibraryRequest, readReply, scriptFor } from '@/library/call-script';

// The fixed script that every library call injects into the hidden web view, run here on a stubbed `fetch` and
// `postMessage` with jsdom's DOMParser, as the page would run it.

interface StubResponse {
  status: number;
  ok: boolean;
  type: string;
  redirected: boolean;
  text: () => Promise<string>;
}

function response(status: number, text: string, more: Partial<StubResponse> = {}): StubResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    type: 'basic',
    redirected: false,
    text: () => Promise.resolve(text),
    ...more,
  };
}

interface Run {
  fetch: jest.Mock<Promise<StubResponse>, [string, Record<string, unknown>]>;
  posted: unknown[];
}

function isFactory(value: unknown): value is (...scope: unknown[]) => unknown {
  return typeof value === 'function';
}

function isScript(value: unknown): value is (request: LibraryRequest) => void {
  return typeof value === 'function';
}

// Runs the script in a scope of its own: `window` with the web view's `postMessage`, the stubbed `fetch` and the
// page's DOMParser.
async function run(request: LibraryRequest, answer: () => Promise<StubResponse>): Promise<Run> {
  const posted: unknown[] = [];
  const fetch = jest.fn((_address: string, _init: Record<string, unknown>) => answer());
  const window = {
    ReactNativeWebView: {
      postMessage: (data: string): void => {
        posted.push(JSON.parse(data));
      },
    },
  };
  // The script's text, made a function in a scope of these three names alone, as the page's own scope gives them.
  const factory: unknown = Reflect.construct(Function, ['window', 'fetch', 'DOMParser', `return (${CALL_SCRIPT});`]);
  const script: unknown = isFactory(factory) ? factory(window, fetch, DOMParser) : null;
  if (!isScript(script)) {
    throw new Error('The script is not a function');
  }
  script(request);
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  return { fetch, posted };
}

const READ: LibraryRequest = { id: 'r1', endpoint: 'getMyBookingList', body: { start: '20261101', end: '20261104' } };

describe('the injected script', () => {
  it('posts the form with the site headers, its own cookie and no redirect', async () => {
    const { fetch, posted } = await run(READ, () => Promise.resolve(response(200, '{"successYN":"Y"}')));

    expect(fetch).toHaveBeenCalledTimes(1);
    const [address, init] = fetch.mock.calls[0] ?? [];
    expect(address).toBe('/NEW_SNU_BOOKING/json/getMyBookingList');
    expect(init).toEqual({
      method: 'POST',
      credentials: 'same-origin',
      redirect: 'manual',
      referrer: 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/booking/roomForm',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        OS_KIND: 'WEB',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: 'start=20261101&end=20261104',
    });
    expect(posted).toEqual([{ id: 'r1', ok: true, result: { successYN: 'Y' } }]);
  });
});

describe("the script's form and allow-list", () => {
  it('encodes every form field, Korean and commas included', async () => {
    const request: LibraryRequest = {
      id: 'w1',
      endpoint: 'setRoomBooking',
      body: { useDesc: '과제', sMemberJsInfo: '김새내,202600001', eMail: 'a+b@example.com' },
    };
    const { fetch } = await run(request, () => Promise.resolve(response(200, '{}')));

    expect(fetch.mock.calls[0]?.[1].body).toBe(
      'useDesc=%EA%B3%BC%EC%A0%9C&sMemberJsInfo=%EA%B9%80%EC%83%88%EB%82%B4%2C202600001&eMail=a%2Bb%40example.com',
    );
  });

  it.each(['setSeatReturn', 'logout', '../json/getMyBookingList'])('refuses %s without fetching', async (endpoint) => {
    const { fetch, posted } = await run({ id: 'x', endpoint, body: {} }, () => Promise.resolve(response(200, '{}')));

    expect(fetch).not.toHaveBeenCalled();
    expect(posted).toEqual([{ id: 'x', ok: false, error: 'notAllowed' }]);
  });
});

describe("the script's error kinds", () => {
  it.each([
    ['HTTP 999', response(999, '')],
    ['a redirect', response(0, '', { type: 'opaqueredirect' })],
    ['a 302', response(302, '')],
    ['a reply that is not JSON', response(200, '<html>로그인</html>')],
  ])('gives sessionEnded for %s, without the reply', async (_case, answer) => {
    const { posted } = await run(READ, () => Promise.resolve(answer));

    expect(posted).toEqual([{ id: 'r1', ok: false, error: 'sessionEnded' }]);
  });

  it('gives network when the fetch fails or the site errs', async () => {
    const failed = await run(READ, () => Promise.reject(new Error('offline')));
    const erred = await run(READ, () => Promise.resolve(response(500, 'oops')));

    expect(failed.posted).toEqual([{ id: 'r1', ok: false, error: 'network' }]);
    expect(erred.posted).toEqual([{ id: 'r1', ok: false, error: 'network' }]);
  });
});

describe("the script's room form", () => {
  it('reads only the four values of the room form', async () => {
    const page = `<html><body><form>
      <input type="hidden" name="tmpUserNames" value="김새내">
      <input type="hidden" name="tmpSchoolNos" value="2026-00001">
      <input type="hidden" name="secret" value="do-not-send">
      <input class="phoneNum" value="010-0000-0000">
      <input class="eMail" value="student@example.com">
    </form></body></html>`;
    const { fetch, posted } = await run({ id: 'f1', endpoint: 'roomForm', body: {} }, () =>
      Promise.resolve(response(200, page)),
    );

    expect(fetch.mock.calls[0]?.[0]).toBe('/NEW_SNU_BOOKING/pc/booking/roomForm');
    expect(fetch.mock.calls[0]?.[1].method).toBe('GET');
    expect(posted).toEqual([
      {
        id: 'f1',
        ok: true,
        result: {
          tmpUserNames: '김새내',
          tmpSchoolNos: '2026-00001',
          phoneNum: '010-0000-0000',
          eMail: 'student@example.com',
        },
      },
    ]);
  });

  it('gives sessionEnded for a room form page without the applicant, as the login page is', async () => {
    const { posted } = await run({ id: 'f2', endpoint: 'roomForm', body: {} }, () =>
      Promise.resolve(response(200, '<html><body>로그인</body></html>')),
    );

    expect(posted).toEqual([{ id: 'f2', ok: false, error: 'sessionEnded' }]);
  });

  it('is injected with its argument written by JSON.stringify alone', () => {
    const request: LibraryRequest = { id: 'q', endpoint: 'getUserCheck', body: { pUserName: "');alert(1);//" } };

    expect(scriptFor(request)).toBe(`(${CALL_SCRIPT})(${JSON.stringify(request)});\ntrue;`);
  });
});

describe('the replies the app takes', () => {
  it('takes a result or a known error kind, and nothing else', () => {
    expect(readReply('{"id":"a","ok":true,"result":{"x":1}}')).toEqual({ id: 'a', ok: true, result: { x: 1 } });
    expect(readReply('{"id":"a","ok":false,"error":"network"}')).toEqual({ id: 'a', ok: false, error: 'network' });
    expect(readReply('{"id":"a","ok":false,"error":"cookie"}')).toBeNull();
    expect(readReply('{"ok":true,"result":1}')).toBeNull();
    expect(readReply('not json')).toBeNull();
  });
});
