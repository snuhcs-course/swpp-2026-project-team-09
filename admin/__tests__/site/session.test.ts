// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { ACCESS_TOKEN, formOf, ID_TOKEN, startFakeMainServer, startSite } from './site';

let mainServer: Awaited<ReturnType<typeof startFakeMainServer>>;
let site: Awaited<ReturnType<typeof startSite>>;
const cookie = `__Host-access-token=${ACCESS_TOKEN}`;

beforeAll(async () => {
  mainServer = await startFakeMainServer();
  site = await startSite(mainServer.url);
});

afterAll(() => {
  site.stop();
  mainServer.stop();
});

async function page(path: string, headers: Record<string, string> = {}): Promise<string> {
  const response = await fetch(`${site.origin}${path}`, { headers: { cookie, ...headers } });
  expect(response.status).toBe(200);
  return response.text();
}

function post(path: string, form: FormData, headers: Record<string, string>): Promise<Response> {
  return fetch(`${site.origin}${path}`, { method: 'POST', body: form, headers, redirect: 'manual' });
}

function attributesOf(setCookie: string): string[] {
  return setCookie
    .split(';')
    .slice(1)
    .map((attribute) => attribute.trim().toLowerCase())
    .toSorted();
}

describe('the session cookie of the built site', () => {
  it('stores the token after a sign-in in one __Host- cookie without Domain or an expiry', async () => {
    const form = formOf(await page('/sign-in?next=%2Fadministrators'), 'credential');
    form.set('credential', ID_TOKEN);

    const response = await post('/sign-in?next=%2Fadministrators', form, { origin: site.origin });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/administrators');
    const cookies = response.headers.getSetCookie();
    expect(cookies.map((each) => each.split(';')[0])).toEqual([cookie, '__Host-administrator-email=kim%40snu.ac.kr']);
    for (const each of cookies) {
      expect(attributesOf(each)).toEqual(['httponly', 'path=/', 'samesite=lax', 'secure']);
    }
  });

  it('sends the sign-in page with the referrer policy Google’s button needs on plain http', async () => {
    const response = await fetch(`${site.origin}/sign-in`);

    expect(response.headers.get('referrer-policy')).toBe('no-referrer-when-downgrade');
  });
});

describe('what the built site lets out and in', () => {
  it('puts the token in no page and no React Server Components payload', async () => {
    const html = await page('/administrators');
    const payload = await page('/administrators', { rsc: '1' });

    expect(html).toContain('kim@snu.ac.kr');
    expect(payload).toContain('kim@snu.ac.kr');
    for (const body of [html, payload, await page('/sign-in'), await page('/sign-in', { rsc: '1' })]) {
      expect(body).not.toContain(ACCESS_TOKEN);
    }
  });

  it('refuses a Server Action posted from another origin before it reaches the main server', async () => {
    const signOut = formOf(await page('/administrators'), '$ACTION_ID_');
    const before = mainServer.requests.length;

    const refused = await post('/administrators', signOut, { cookie, origin: 'https://elsewhere.example' });

    expect(refused.status).toBeGreaterThanOrEqual(400);
    expect(refused.headers.getSetCookie()).toEqual([]);
    expect(mainServer.requests.slice(before)).toEqual([]);
    const accepted = await post('/administrators', signOut, { cookie, origin: site.origin });
    expect(accepted.status).toBe(303);
    expect(mainServer.requests.slice(before)).toEqual(['POST /admin/auth/sign-out']);
    const deleted = accepted.headers.getSetCookie();
    expect(deleted.map((each) => each.split(';')[0])).toEqual(['__Host-access-token=', '__Host-administrator-email=']);
    for (const each of deleted) {
      expect(attributesOf(each)).toEqual(
        expect.arrayContaining(['path=/', 'secure', 'expires=thu, 01 jan 1970 00:00:00 gmt']),
      );
    }
  });
});
