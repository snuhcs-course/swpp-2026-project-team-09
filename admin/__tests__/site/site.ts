/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type ChildProcess, spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { setTimeout as wait } from 'node:timers/promises';

export const BUILD_SETTINGS = { NEXT_DIST_DIR: '.next-test', NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'test-client-id' };

export const ACCESS_TOKEN = 'access-token-for-the-site-tests';
export const ID_TOKEN = `e30.${Buffer.from(JSON.stringify({ email: 'kim@snu.ac.kr' })).toString('base64url')}.signature`;

function listening(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('The server listens on no port.');
      }
      resolve(address.port);
    });
  });
}

function answer(request: IncomingMessage, response: ServerResponse, body: string): void {
  const signedIn = request.headers.authorization === `Bearer ${ACCESS_TOKEN}`;
  const route = `${request.method} ${request.url}`;
  if (route === 'POST /admin/auth/google') {
    const known = body === JSON.stringify({ idToken: ID_TOKEN });
    response.writeHead(known ? 200 : 403, { 'content-type': 'application/json' });
    response.end(known ? JSON.stringify({ accessToken: ACCESS_TOKEN }) : '{}');
  } else if (signedIn && route === 'POST /admin/auth/sign-out') {
    response.writeHead(204).end();
  } else if (signedIn && route === 'GET /admin/administrators') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify([{ id: '0b0e5a3c-1d2f-4e5a-8b6c-7d8e9f0a1b2c', email: 'kim@snu.ac.kr', signedIn: true }]),
    );
  } else {
    response.writeHead(401, { 'content-type': 'application/json' }).end('{}');
  }
}

// A main server that knows one Administrator, and records each request as "METHOD /path".
export async function startFakeMainServer(): Promise<{ url: string; requests: string[]; stop: () => void }> {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(`${request.method} ${request.url}`);
    let body = '';
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    request.on('end', () => {
      answer(request, response, body);
    });
  });
  const port = await listening(server);
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    stop: () => {
      server.close();
    },
  };
}

async function freePort(): Promise<number> {
  const server = createServer();
  const port = await listening(server);
  server.close();
  return port;
}

async function untilUp(url: string, next: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (next.exitCode !== null) {
      throw new Error(`next start ended with ${next.exitCode}`);
    }
    try {
      // oxlint-disable-next-line no-await-in-loop -- polls until the server answers
      await fetch(url);
      return;
    } catch {
      // oxlint-disable-next-line no-await-in-loop -- waits before the next try
      await wait(100);
    }
  }
  throw new Error('next start did not answer');
}

// Starts the built site, as `pnpm start` does, on a free port.
export async function startSite(mainServerUrl: string): Promise<{ origin: string; stop: () => void }> {
  const port = await freePort();
  const next = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--port', String(port), '--hostname', '127.0.0.1'],
    { env: { ...process.env, ...BUILD_SETTINGS, MAIN_SERVER_URL: mainServerUrl }, stdio: 'ignore' },
  );
  const origin = `http://127.0.0.1:${port}`;
  await untilUp(origin, next);
  return {
    origin,
    stop: () => {
      next.kill();
    },
  };
}

function unescape(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

// The hidden fields of the first form holding a field whose name starts with `field`, as a browser without JavaScript
// would post them. For a form bound to a Server Action, they name the action.
export function formOf(html: string, field: string): FormData {
  const form = [...html.matchAll(/<form[^>]*>([\s\S]*?)<\/form>/gu)].find(([, inside]) =>
    inside?.includes(`name="${field}`),
  );
  if (form === undefined) {
    throw new Error(`No form with ${field} on the page`);
  }
  const data = new FormData();
  for (const [, name, value] of (form[1] ?? '').matchAll(
    /<input type="hidden" name="([^"]*)"(?: value="([^"]*)")?/gu,
  )) {
    data.append(unescape(name ?? ''), unescape(value ?? ''));
  }
  return data;
}
