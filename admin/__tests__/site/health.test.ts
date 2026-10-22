/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { startFakeMainServer, startSite } from './site';

let mainServer: Awaited<ReturnType<typeof startFakeMainServer>>;
let site: Awaited<ReturnType<typeof startSite>>;

beforeAll(async () => {
  mainServer = await startFakeMainServer();
  site = await startSite(mainServer.url);
});

afterAll(() => {
  site.stop();
  mainServer.stop();
});

function check(path: string): Promise<Response> {
  return fetch(`${site.origin}${path}`);
}

describe('the health checks of the built site', () => {
  it('answers the liveness check without a session, never to be cached', async () => {
    const response = await check('/health/live');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok' });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('is ready while the main server is live, and not once it stops', async () => {
    const ready = await check('/health/ready');

    expect(ready.status).toBe(200);
    expect(await ready.json()).toMatchObject({ status: 'ok', info: { mainServer: { status: 'up' } } });
    expect(ready.headers.get('cache-control')).toContain('no-store');

    mainServer.stop();
    const notReady = await check('/health/ready');

    expect(notReady.status).toBe(503);
    expect(await notReady.json()).toMatchObject({ status: 'error', error: { mainServer: { status: 'down' } } });
    expect(notReady.headers.get('cache-control')).toContain('no-store');
    expect((await check('/health/live')).status).toBe(200);
  });
});
