import { io, type Socket } from 'socket.io-client';
import type { Position } from '@/api/types';

// The app's one connection to the socket server (`socket-server/README.md`, "Socket connection"). It opens with the
// access token and tells what arrives: the Session's end, the positions of the Users the app may see, and the signals
// that something the app shows has changed. The socket server closes it when the access token expires, and refuses a
// token that has expired; either way the connection renews the Session once and opens again with the new token.

export interface LiveHandlers {
  // The access token the app holds at that moment. Asked at every attempt to connect, reconnections included.
  accessToken: () => string | null;
  // Renews the Session: true with a new access token, false when the main server refused. Throws when nothing answered.
  renew: () => Promise<boolean>;
  // The connection opened, the first time or again: what changed while it was closed is to be fetched.
  onConnect: (again: boolean) => void;
  // The Session is over. `replaced`: a sign-in on another phone ended it.
  onSessionEnded: (replaced: boolean) => void;
  onPosition: (position: Position) => void;
  onPositionRemoved: (userId: string) => void;
  // Any other event: a signal by its name, which carries nothing.
  onSignal: (name: string) => void;
}

// When nothing answered a renewal, it is tried again after this wait.
export const RETRY_MS = 5000;

const OWN_EVENTS = new Set(['session-ended', 'position', 'position-removed']);

function field(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, name) : undefined;
}

function isPosition(value: unknown): value is Position {
  return (
    typeof field(value, 'userId') === 'string' &&
    typeof field(value, 'latitude') === 'number' &&
    typeof field(value, 'longitude') === 'number' &&
    typeof field(value, 'measuredAt') === 'string'
  );
}

// Where the connection is. `renewed`: the last refusal was followed by a renewal already, so a second one is the
// Session's end.
interface State {
  closed: boolean;
  ended: boolean;
  connectedBefore: boolean;
  renewed: boolean;
  retry: ReturnType<typeof setTimeout> | null;
}

// What the connection does about its own opening and closing: it renews the Session once and opens again when the
// server closes it or refuses its token, and gives up as the Session's end when a renewal is refused.
function keepOpen(socket: Socket, handlers: LiveHandlers, state: State, end: (replaced: boolean) => void): void {
  const renewAndConnect = (): void => {
    handlers.renew().then(
      (renewed) => {
        if (state.closed || state.ended) {
          return;
        }
        if (!renewed) {
          end(false);
          return;
        }
        state.renewed = true;
        socket.connect();
      },
      () => {
        if (state.closed || state.ended) {
          return;
        }
        // Nothing answered: the main server may be out of reach for a moment.
        state.retry = setTimeout(renewAndConnect, RETRY_MS);
      },
    );
  };
  socket.on('connect', () => {
    state.renewed = false;
    handlers.onConnect(state.connectedBefore);
    state.connectedBefore = true;
  });
  socket.on('connect_error', () => {
    // A network failure: Socket.IO tries again by itself.
    if (socket.active || state.closed || state.ended) {
      return;
    }
    // Refused: the token has expired or the Session is over.
    if (state.renewed) {
      end(false);
      return;
    }
    renewAndConnect();
  });
  socket.on('disconnect', (reason) => {
    // Only the server's own close is the token's expiry. Socket.IO reconnects by itself after any other.
    if (reason !== 'io server disconnect' || state.closed || state.ended) {
      return;
    }
    renewAndConnect();
  });
}

// What arrives over the connection.
function listen(socket: Socket, handlers: LiveHandlers, end: (replaced: boolean) => void): void {
  socket.on('session-ended', (event: unknown) => {
    end(field(event, 'code') === 'SESSION_REPLACED');
  });
  socket.on('position', (position: unknown) => {
    if (isPosition(position)) {
      const { userId, latitude, longitude, measuredAt } = position;
      handlers.onPosition({ userId, latitude, longitude, measuredAt });
    }
  });
  socket.on('position-removed', (event: unknown) => {
    const userId = field(event, 'userId');
    if (typeof userId === 'string') {
      handlers.onPositionRemoved(userId);
    }
  });
  socket.onAny((name: string) => {
    if (!OWN_EVENTS.has(name)) {
      handlers.onSignal(name);
    }
  });
}

// Opens the connection and gives the way to close it.
export function openLiveConnection(url: string, handlers: LiveHandlers): () => void {
  const socket: Socket = io(url, {
    transports: ['websocket'],
    auth: (send) => {
      send({ token: handlers.accessToken() });
    },
  });
  const state: State = { closed: false, ended: false, connectedBefore: false, renewed: false, retry: null };
  const end = (replaced: boolean): void => {
    if (state.ended) {
      return;
    }
    state.ended = true;
    socket.disconnect();
    handlers.onSessionEnded(replaced);
  };
  keepOpen(socket, handlers, state, end);
  listen(socket, handlers, end);
  return () => {
    state.closed = true;
    if (state.retry !== null) {
      clearTimeout(state.retry);
    }
    socket.disconnect();
  };
}
