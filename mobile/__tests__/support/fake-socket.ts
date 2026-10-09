/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Socket.IO's client, as a test drives it. A test file puts it in place of `socket.io-client`:
//
//   jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));
//
// A socket tries to connect when it is made, as Socket.IO's does, and each attempt asks the app for its token. The
// test then says how the socket server answers.

type Listener = (...args: unknown[]) => void;

interface Options {
  auth?: (send: (data: { token: string | null }) => void) => void;
}

export class FakeSocket {
  readonly url: string;
  // Socket.IO's own: false once the socket no longer reconnects by itself.
  active = true;
  connected = false;
  // The token each attempt to connect sent, in order.
  readonly tokens: (string | null)[] = [];
  private readonly listeners = new Map<string, Listener[]>();
  private readonly anyListeners: Listener[] = [];
  private readonly options: Options;

  constructor(url: string, options: Options) {
    this.url = url;
    this.options = options;
    this.connect();
  }

  on(name: string, listener: Listener): this {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
    return this;
  }

  onAny(listener: Listener): this {
    this.anyListeners.push(listener);
    return this;
  }

  connect(): this {
    this.active = true;
    this.options.auth?.((data) => {
      this.tokens.push(data.token);
    });
    return this;
  }

  disconnect(): this {
    this.active = false;
    this.connected = false;
    return this;
  }

  // --- What the socket server does ---

  accept(): void {
    this.connected = true;
    this.fire('connect');
  }

  // Refuses the token: Socket.IO does not try again by itself.
  refuse(): void {
    this.active = false;
    this.fire('connect_error', new Error('Unauthorized'));
  }

  // Closes the connection, as at the token's expiry.
  close(): void {
    this.connected = false;
    this.active = false;
    this.fire('disconnect', 'io server disconnect');
  }

  send(name: string, ...args: unknown[]): void {
    for (const listener of this.anyListeners) {
      listener(name, ...args);
    }
    this.fire(name, ...args);
  }

  private fire(name: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(name) ?? []) {
      listener(...args);
    }
  }
}

export const sockets: FakeSocket[] = [];

export function io(url: string, options: Options): FakeSocket {
  const socket = new FakeSocket(url, options);
  sockets.push(socket);
  return socket;
}
