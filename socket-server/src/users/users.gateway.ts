import { JwtService } from '@nestjs/jwt';
import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { DefaultEventsMap, Server } from 'socket.io';

// What an access token says: the User's identifier as the subject. The main server signs it; its expiry is the
// standard `exp` claim.
interface AccessTokenPayload {
  sub: string;
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

// The app's socket connection, on the same port as the HTTP server.
@WebSocketGateway()
export class UsersGateway implements OnGatewayInit<UsersServer> {
  @WebSocketServer()
  server!: UsersServer;

  constructor(private readonly jwt: JwtService) {}

  // The app sends its access token when it connects, as Socket.IO's documentation shows: `io(url, { auth: { token } })`.
  // This middleware runs before the connection opens, so a refused app gets `connect_error` and never connects.
  afterInit(server: UsersServer): void {
    server.use((socket, next) => {
      this.verify(socket.handshake.auth.token).then(
        (user) => {
          socket.data.user = user;
          next();
        },
        () => {
          next(new Error('Unauthorized'));
        },
      );
    });
  }

  // The User a valid access token names. A missing, expired or altered token, or one signed with another key, rejects.
  private async verify(token: unknown): Promise<SignedInUser> {
    if (typeof token !== 'string') {
      throw new TypeError('No access token');
    }
    const { sub } = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    return { id: sub };
  }
}
