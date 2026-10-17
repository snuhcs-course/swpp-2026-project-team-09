/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { z } from 'zod';
import { writeSettings } from './settings.js';
import { compose, published, startStack, type Stack } from './stack.js';

const root = mkdtempSync(join(tmpdir(), 'flow-tests-deploy-'));
const statusFolder = join(root, 'status');
const apkFolder = join(root, 'apk');

// The settings file as the bootstrap writes it on the Dev Server, with test values where a person fills one in.
const SERVER_SETTINGS = {
  COMPOSE_PROFILES: 'demo',
  DEPLOY_STATUS_DIR: statusFolder,
  DEPLOY_APK_DIR: apkFolder,
  POSTGRES_PASSWORD: 'deploy-test-postgres',
  MAIN_DB_PASSWORD: 'deploy-test-main',
  MATCH_DB_PASSWORD: 'deploy-test-match',
  PUBLIC_URL: 'http://deploy-test.example',
  GOOGLE_APP_CLIENT_ID: 'deploy-test-app.apps.googleusercontent.com',
  GOOGLE_ADMIN_CLIENT_ID: 'deploy-test-admin.apps.googleusercontent.com',
  ANDROID_CERTIFICATE_FINGERPRINTS:
    'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C',
  ROUND_INTERVAL_SECONDS: '60',
  KAKAO_REST_API_KEY: 'deploy-test',
  INITIAL_ADMINISTRATOR_EMAILS: 'admin@deploy-test.example',
  DEMO_ACCOUNT_EMAILS: 'student@snu.ac.kr',
};

// The Dev Server's Compose files, in the order the deploy script lays them, under a project name of their own.
const DEPLOYED: Stack = {
  project: 'snu-now-deploy-test',
  files: ['compose.yaml', 'compose.deploy.yaml'],
  settings: join(root, 'settings'),
};

const WITHOUT_DEMO: Stack = { ...DEPLOYED, settings: join(root, 'settings-without-demo') };

// What the test starts: the proxy on a free port of the loopback address instead of 80.
const STARTED: Stack = { ...DEPLOYED, files: [...DEPLOYED.files, 'flow-tests/compose.deploy.test.yaml'] };

const composeConfig = z.object({
  services: z.record(
    z.string(),
    z.object({
      ports: z
        .array(z.object({ target: z.number(), published: z.string(), host_ip: z.string().optional() }))
        .optional(),
      restart: z.string().optional(),
      logging: z.unknown().optional(),
    }),
  ),
});

const openPacket = z.object({ sid: z.string(), upgrades: z.array(z.string()) });

async function config(stack: Stack): Promise<z.infer<typeof composeConfig>> {
  return composeConfig.parse(JSON.parse(await compose(stack, 'config', '--format', 'json')));
}

// The message of the connection error that a socket.io client with a bad token receives over the WebSocket transport
// alone. One that cannot upgrade receives "websocket error" instead.
function refusal(server: string): Promise<string> {
  const socket = io(server, { auth: { token: 'not-an-access-token' }, transports: ['websocket'], reconnection: false });
  let timer: NodeJS.Timeout | undefined;
  return new Promise<string>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('The socket server neither accepted nor refused the connection within 5 s'));
    }, 5000);
    socket.once('connect', () => {
      reject(new Error('The socket server accepted a bad token'));
    });
    socket.once('connect_error', (error) => {
      resolve(error.message);
    });
  }).finally(() => {
    clearTimeout(timer);
    socket.close();
  });
}

let proxy = '';
let removeStack: (() => Promise<void>) | undefined;

beforeAll(async () => {
  mkdirSync(statusFolder);
  mkdirSync(apkFolder);
  writeSettings(DEPLOYED.settings, SERVER_SETTINGS);
  const { COMPOSE_PROFILES: _demo, ...withoutDemo } = SERVER_SETTINGS;
  writeSettings(WITHOUT_DEMO.settings, withoutDemo);
  removeStack = await startStack(STARTED);
  proxy = await published(STARTED, 'proxy', 80);
}, 900_000);

afterAll(async () => {
  await removeStack?.();
  rmSync(root, { recursive: true, force: true });
}, 120_000);

it('`docker compose config` with the demo profile lists `demo-seed` and `demo-walker` and not `demo-menus`; without the profile it lists none of the three.', async () => {
  const demo = Object.keys((await config(DEPLOYED)).services);
  const plain = Object.keys((await config(WITHOUT_DEMO)).services);

  expect(demo).toContain('demo-seed');
  expect(demo).toContain('demo-walker');
  expect(demo).not.toContain('demo-menus');
  expect(plain).not.toContain('demo-seed');
  expect(plain).not.toContain('demo-walker');
  expect(plain).not.toContain('demo-menus');
});

it('`docker compose config` shows the proxy as the only service with a published port, every service with `restart: unless-stopped`, and the json-file log limits on every service.', async () => {
  const { services } = await config(DEPLOYED);
  const publishing = Object.entries(services).filter(([, service]) => (service.ports ?? []).length > 0);

  expect(publishing.map(([name]) => name)).toEqual(['proxy']);
  // On every address of the server, which no host_ip means.
  expect(services.proxy?.ports).toEqual([{ target: 80, published: '80' }]);
  for (const [name, service] of Object.entries(services)) {
    expect({ name, restart: service.restart }).toEqual({ name, restart: 'unless-stopped' });
    expect({ name, logging: service.logging }).toEqual({
      name,
      logging: { driver: 'json-file', options: { 'max-size': '10m', 'max-file': '3' } },
    });
  }
});

it('Through the proxy, `/health/ready` answers 200 from the main server.', async () => {
  const response = await fetch(`${proxy}/health/ready`);

  expect(response.status).toBe(200);
  // The socket server's readiness has no database.
  expect(await response.json()).toMatchObject({ info: { database: { status: 'up' } } });
});

it("Through the proxy, `/socket.io/?EIO=4&transport=polling` answers an engine.io handshake, and a socket.io client connecting over the WebSocket transport with a bad token receives the socket server's connection error, which shows the upgrade reached it.", async () => {
  const response = await fetch(`${proxy}/socket.io/?EIO=4&transport=polling`);
  const handshake = await response.text();

  expect(response.status).toBe(200);
  // The open packet, 0, and its JSON.
  expect(handshake[0]).toBe('0');
  expect(openPacket.parse(JSON.parse(handshake.slice(1))).upgrades).toEqual(['websocket']);
  await expect(refusal(proxy)).resolves.toBe('Unauthorized');
});

it('Through the proxy, `/deploy-status` serves a JSON file placed in the status folder, and `/apk/` lists a file placed in the APK folder.', async () => {
  const status = { trackedRef: 'development', result: 'deployed', deployedCommit: 'a55df8b8' };
  writeFileSync(join(statusFolder, 'status.json'), JSON.stringify(status));
  writeFileSync(join(apkFolder, 'snu-now-dev-2026-10-17.apk'), 'an APK');

  const statusResponse = await fetch(`${proxy}/deploy-status`);
  expect(statusResponse.status).toBe(200);
  expect(statusResponse.headers.get('content-type')).toMatch(/^application\/json/u);
  expect(await statusResponse.json()).toEqual(status);
  const listing = await fetch(`${proxy}/apk/`);
  expect(listing.status).toBe(200);
  expect(await listing.text()).toContain('snu-now-dev-2026-10-17.apk');
  const apk = await fetch(`${proxy}/apk/snu-now-dev-2026-10-17.apk`);
  expect(await apk.text()).toBe('an APK');
});

it("Through the proxy, an unknown path gets the main server's 404 body, not Caddy's.", async () => {
  const response = await fetch(`${proxy}/no-such-route`);

  expect(response.status).toBe(404);
  // Caddy's own 404 has an empty body.
  expect(await response.json()).toEqual({ statusCode: 404, error: 'Not Found', message: 'Cannot GET /no-such-route' });
});
