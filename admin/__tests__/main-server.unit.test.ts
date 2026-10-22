/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The main-server client through mainServer's calls, fetch stubbed: its setting, the headers each call sends, and each
// kind of answer. Paths, statuses and refusal bodies from main-server's README (Administrators, Global Events).

import { type GlobalEventChange, mainServer, MainServerError } from '@/main-server';

// A reserved name that never resolves, should a call get past the stub.
const ADDRESS = 'http://main-server.test:3000';
const TOKEN = 'access-token';
const KEY = 'idempotency-key-1';
const ADMINISTRATOR_ID = '3c1d2e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const EVENT_ID = '0f8b1c1e-6a52-4d8e-9a43-0b6c1f2d3e4a';
const DRAFT: GlobalEventChange = {
  title: 'SNU Festival',
  description: '',
  startsAt: '2026-10-28T18:00:00+09:00',
  endsAt: null,
  place: null,
  latitude: null,
  longitude: null,
};

const fetchStub = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchStub.mockReset();
  vi.stubEnv('MAIN_SERVER_URL', ADDRESS);
  vi.stubGlobal('fetch', fetchStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function answer(response: Response): void {
  fetchStub.mockResolvedValueOnce(response);
}

// What the client handed fetch, on its only call.
function sent(): {
  url: string;
  method?: string;
  cache?: RequestCache;
  headers: Record<string, string>;
  body: unknown;
} {
  expect(fetchStub).toHaveBeenCalledOnce();
  const [url, init = {}] = fetchStub.mock.calls[0] ?? [''];
  return {
    url: new URL(url instanceof Request ? url.url : url).href,
    method: init.method,
    cache: init.cache,
    headers: Object.fromEntries(new Headers(init.headers)),
    body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : init.body,
  };
}

// The MainServerError a call is refused with.
async function refusalOf(call: Promise<unknown>): Promise<MainServerError> {
  try {
    await call;
  } catch (error) {
    if (error instanceof MainServerError) {
      return error;
    }
    throw error;
  }
  throw new Error('The call was not refused.');
}

describe("The main-server client's address", () => {
  it.each([
    ['unset', undefined],
    ['empty', ''],
  ])('MAIN_SERVER_URL %s → refused, naming the setting, and nothing sent', async (_, address) => {
    vi.stubEnv('MAIN_SERVER_URL', address);

    await expect(mainServer.listAdministrators(TOKEN)).rejects.toThrow('MAIN_SERVER_URL is not set.');
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('a call → its method and path at MAIN_SERVER_URL, never cached', async () => {
    answer(Response.json([]));

    await mainServer.listGlobalEvents(TOKEN, 'draft');

    expect(sent()).toMatchObject({
      url: `${ADDRESS}/admin/global-events?state=draft`,
      method: 'GET',
      cache: 'no-store',
    });
  });
});

describe('The headers the main-server client sends', () => {
  it.each<[string, () => Promise<unknown>, Record<string, string>, unknown]>([
    [
      'signing in, with a body and no token',
      (): Promise<unknown> => mainServer.signIn('id-token'),
      { 'content-type': 'application/json' },
      { idToken: 'id-token' },
    ],
    [
      'signing out, with a token and no body',
      (): Promise<unknown> => mainServer.signOut(TOKEN),
      { authorization: `Bearer ${TOKEN}` },
      undefined,
    ],
    [
      'registering an Administrator, with a token and a body',
      (): Promise<unknown> => mainServer.registerAdministrator(TOKEN, 'kim@snu.ac.kr'),
      { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      { email: 'kim@snu.ac.kr' },
    ],
    [
      'creating a Draft, with a token, a body and an Idempotency-Key',
      (): Promise<unknown> => mainServer.createGlobalEvent(TOKEN, KEY, DRAFT),
      { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json', 'idempotency-key': KEY },
      DRAFT,
    ],
  ])('%s → only the headers it was given', async (_, call, headers, body) => {
    answer(new Response(null, { status: 204 }));

    await call();

    const request = sent();
    expect(request.headers).toEqual(headers);
    expect(request.body).toEqual(body);
  });
});

describe("The main server's answers, through the client", () => {
  it('an answer with a body → that body', async () => {
    answer(Response.json({ accessToken: TOKEN }));

    await expect(mainServer.signIn('id-token')).resolves.toEqual({ accessToken: TOKEN });
  });

  it('204 → nothing', async () => {
    answer(new Response(null, { status: 204 }));

    await expect(mainServer.removeAdministrator(TOKEN, ADMINISTRATOR_ID)).resolves.toBeUndefined();
  });

  it('fetch rejects, as when the main server cannot be reached → the same error, passed on to the caller', async () => {
    const unreachable = new TypeError('fetch failed');
    fetchStub.mockRejectedValueOnce(unreachable);

    await expect(mainServer.listPlaces(TOKEN)).rejects.toBe(unreachable);
  });
});

describe("The main server's refusals, through the client", () => {
  it.each<[string, number, object]>([
    ['an unknown Global Event', 404, { code: 'GLOBAL_EVENT_NOT_FOUND' }],
    ['a version that is not the stored one', 409, { code: 'GLOBAL_EVENT_CHANGED', version: 4 }],
    [
      'a Draft without a start or a position',
      409,
      { code: 'GLOBAL_EVENT_INCOMPLETE', missing: ['startsAt', 'position'] },
    ],
    [
      'a body that breaks a rule',
      400,
      { statusCode: 400, message: ['endsAt: The end must be after the start'], error: 'Bad Request' },
    ],
  ])('a refusal with a JSON body, %s → a MainServerError with its status and body', async (_, status, refusal) => {
    answer(Response.json(refusal, { status }));

    const error = await refusalOf(mainServer.changeGlobalEventState(TOKEN, EVENT_ID, 'publish', 3));

    expect({ status: error.status, refusal: error.refusal }).toEqual({ status, refusal });
  });

  it.each([
    ["a proxy's HTML page", 502, '<html><body>Bad Gateway</body></html>'],
    ['an empty body', 500, ''],
  ])(
    'a refusal whose body is not JSON, %s → a MainServerError with its status and no refusal',
    async (_, status, page) => {
      answer(new Response(page, { status, headers: { 'content-type': 'text/html' } }));

      const error = await refusalOf(mainServer.listUsers(TOKEN));

      expect({ status: error.status, refusal: error.refusal }).toEqual({ status, refusal: {} });
    },
  );
});
