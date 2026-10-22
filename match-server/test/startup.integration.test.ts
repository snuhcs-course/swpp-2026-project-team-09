/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { once } from 'node:events';
import { createServer, Server, Socket } from 'node:net';
import { inject } from 'vitest';
import { startApp } from './start-app.js';

// Accepts connections and never answers, like a database host that has stopped responding.
async function startSilentServer(): Promise<Server> {
  const server = createServer((socket: Socket) => {
    // Reading what arrives lets the socket see the client hang up, so that the server can close.
    socket.resume();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server;
}

function portOf(server: Server): number {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('The server does not listen on a TCP port');
  }
  return address.port;
}

// Nothing listens on port 1, so a connection there is refused at once.

describe('Startup', () => {
  const settings = inject('settings');

  it('stops when the database cannot be reached', async () => {
    await expect(startApp({ ...settings, DATABASE_URL: 'postgresql://match:match@127.0.0.1:1/match' })).rejects.toThrow(
      "Can't reach database server",
    );
  });

  it('stops when the database does not answer', { timeout: 10_000 }, async () => {
    const server = await startSilentServer();
    try {
      await expect(
        startApp({ ...settings, DATABASE_URL: `postgresql://match:match@127.0.0.1:${portOf(server)}/match` }),
      ).rejects.toThrow('connection timeout');
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});
