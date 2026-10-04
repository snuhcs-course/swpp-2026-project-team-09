import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { userRoom } from '../users/users.gateway.js';
import { type SignalEvent } from './dto/signal.dto.js';

// The apps' connections, which UsersGateway accepts on the same server.
@WebSocketGateway()
export class SignalsGateway {
  @WebSocketServer()
  server!: Server;

  // Knows no signal by name: the main server decides what each one is and whom it is for.
  send({ userIds, name, payload }: SignalEvent): void {
    const args = payload === undefined ? [] : [payload];
    if (userIds === undefined) {
      this.server.emit(name, ...args);
      return;
    }
    // Socket.IO would take an empty list of rooms for every connection.
    if (userIds.length === 0) {
      return;
    }
    this.server.to(userIds.map((userId) => userRoom(userId))).emit(name, ...args);
  }
}
