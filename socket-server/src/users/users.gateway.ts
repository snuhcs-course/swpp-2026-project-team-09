/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-09-30  Opus 5.5   prompted by fyoon46
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { userRoom } from '../common/rooms.js';
import { type SessionEndReason } from './dto/session-ended.dto.js';

// What an access token says: the User's identifier as the subject, the session as `sid`, and its expiry as `exp` in
// seconds. The main server signs it.
interface AccessTokenPayload {
  sub: string;
  sid: string;
  exp: number;
}

// The User a connection belongs to.
interface SignedInUser {
  readonly id: string;
}

// What the socket server keeps on each connection, in Socket.IO's `socket.data`.
interface ConnectionData {
  user: SignedInUser;
  sessionId: string;
  // Milliseconds since the epoch, as Date.now() counts.
  tokenExpiresAt: number;
}

type UsersServer = Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, ConnectionData>;
type UsersSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, ConnectionData>;

function sessionRoom(sessionId: string): string {
  return `session:${sessionId}`;
}

// The app's socket connection, on the same port as the HTTP server.
@WebSocketGateway()
export class UsersGateway implements OnGatewayInit<UsersServer>, OnGatewayConnection<UsersSocket> {
  @WebSocketServer()
  server!: UsersServer;

  constructor(private readonly jwt: JwtService) {}

  // The app sends its access token in Socket.IO's `auth` option as `{ token }` (see README.md). This middleware runs
  // on every attempt to connect, before the connection opens, so a refused app gets `connect_error` and never connects.
  afterInit(server: UsersServer): void {
    server.use((socket, next) => {
      this.verify(socket.handshake.auth.token).then(
        ({ sub, sid, exp }) => {
          socket.data = { user: { id: sub }, sessionId: sid, tokenExpiresAt: exp * 1000 };
          next();
        },
        () => {
          next(new Error('Unauthorized'));
        },
      );
    });
  }

  // The token is checked only when a connection opens, so the connection closes when the token expires. The app then
  // refreshes its tokens and connects again, which a session that has ended cannot do.
  async handleConnection(socket: UsersSocket): Promise<void> {
    await socket.join([sessionRoom(socket.data.sessionId), userRoom(socket.data.user.id)]);
    const expiry = setTimeout(() => {
      socket.disconnect(true);
    }, socket.data.tokenExpiresAt - Date.now());
    socket.once('disconnect', () => {
      clearTimeout(expiry);
    });
  }

  // The event goes first, so that the app learns why before it is disconnected.
  endSession(sessionId: string, reason: SessionEndReason): void {
    this.server
      .to(sessionRoom(sessionId))
      .emit('session-ended', reason === 'replaced' ? { code: 'SESSION_REPLACED' } : {});
    this.server.in(sessionRoom(sessionId)).disconnectSockets(true);
  }

  // A missing, expired or altered token, one signed with another key, an Administrator's token, or one without a
  // session rejects.
  private async verify(token: unknown): Promise<AccessTokenPayload> {
    if (typeof token !== 'string') {
      throw new TypeError('No access token');
    }
    const payload = await this.jwt.verifyAsync<Partial<AccessTokenPayload>>(token);
    if (payload.sub === undefined || payload.sid === undefined || payload.exp === undefined) {
      throw new TypeError('No session');
    }
    return { sub: payload.sub, sid: payload.sid, exp: payload.exp };
  }
}
