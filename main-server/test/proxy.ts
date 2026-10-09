// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by fyoon46, reviewed by TaeHyun79 in #16
import { once } from 'node:events';
import { connect, createServer, Socket } from 'node:net';

// Stands between a server and one of the shared stores, so that a test can take the store away from that server alone.
// Stopping a store's container instead leaves its port open for a moment on Docker Desktop, more so under load: the
// server's connections then neither answer nor close, and the server cannot close cleanly.
export interface StoreProxy {
  // The port on 127.0.0.1 to give the server in place of the store's.
  port: number;
  // Drops every connection and refuses new ones, as a store that has stopped does.
  stop(): Promise<void>;
}

export async function startProxy(host: string, port: number): Promise<StoreProxy> {
  const sockets = new Set<Socket>();
  const server = createServer((client) => {
    const store = connect(port, host);
    for (const socket of [client, store]) {
      sockets.add(socket);
      socket.on('close', () => {
        sockets.delete(socket);
      });
      socket.on('error', () => {
        client.destroy();
        store.destroy();
      });
    }
    client.pipe(store).pipe(client);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('The proxy does not listen on a TCP port');
  }
  return {
    port: address.port,
    async stop() {
      const closed = once(server, 'close');
      server.close();
      for (const socket of sockets) {
        socket.destroy();
      }
      await closed;
    },
  };
}
