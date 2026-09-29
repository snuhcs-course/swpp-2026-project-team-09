import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Redis } from 'ioredis';
import { DefaultEventsMap, ExtendedError, Server, Socket } from 'socket.io';
import { REDIS } from '../common/redis.module.js';

// What an access token says: the User's identifier as the subject, and the session as `sid`. The main server signs
// it; its expiry is the standard `exp` claim.
interface AccessTokenPayload {
  sub: string;
  sid: string;
}

// The User a connection belongs to.
interface SignedInUser {
  readonly id: string;
}

// What the socket server keeps on each connection, in Socket.IO's `socket.data`.
interface ConnectionData {
  user: SignedInUser;
}

type UsersServer = Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, ConnectionData>;
type UsersSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, ConnectionData>;

// The main server records an ended session under this key, as `replaced` or `ended`, for as long as an access token
// is valid.
function endedSessionKey(sessionId: string): string {
  return `ended-session:${sessionId}`;
}

function sessionRoom(sessionId: string): string {
  return `session:${sessionId}`;
}

// The main server's 401 carries the same code.
function endDetails(end: string): { code?: string } {
  return end === 'replaced' ? { code: 'SESSION_REPLACED' } : {};
}

// The app's socket connection, on the same port as the HTTP server.
@WebSocketGateway()
export class UsersGateway implements OnGatewayInit<UsersServer> {
  @WebSocketServer()
  server!: UsersServer;

  constructor(
    private readonly jwt: JwtService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // The app sends its access token in Socket.IO's `auth` option as `{ token }` (see README.md). This middleware runs
  // on every attempt to connect, before the connection opens, so a refused app gets `connect_error` and never connects.
  afterInit(server: UsersServer): void {
    server.use((socket, next) => {
      this.admit(socket).then(next, () => {
        next(new Error('Service Unavailable'));
      });
    });
  }

  // Answers the error that refuses the connection, if any. Rejects while Redis cannot be reached, so that no connection
  // opens without the session check.
  private async admit(socket: UsersSocket): Promise<ExtendedError | undefined> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.verify(socket.handshake.auth.token);
    } catch {
      return new Error('Unauthorized');
    }
    const end = await this.redis.get(endedSessionKey(payload.sid));
    if (end !== null) {
      return Object.assign(new Error('Unauthorized'), { data: endDetails(end) });
    }
    socket.data.user = { id: payload.sub };
    await socket.join(sessionRoom(payload.sid));
    return undefined;
  }

  // The event goes first, so that the app learns why before it is disconnected.
  endSession(sessionId: string, end: string): void {
    this.server.to(sessionRoom(sessionId)).emit('session-ended', endDetails(end));
    this.server.in(sessionRoom(sessionId)).disconnectSockets(true);
  }

  private verify(token: unknown): Promise<AccessTokenPayload> {
    if (typeof token !== 'string') {
      return Promise.reject(new TypeError('No access token'));
    }
    return this.jwt.verifyAsync<AccessTokenPayload>(token);
  }
}
