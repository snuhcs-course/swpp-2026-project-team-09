/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { type ShuttleVehicle } from './dto/shuttle-vehicles-updated.dto.js';

// The apps' connections, which UsersGateway accepts on the same server.
@WebSocketGateway()
export class ShuttleGateway {
  @WebSocketServer()
  server!: Server;

  // To every connected app, whether or not it shows the shuttle.
  sendVehicles(vehicles: ShuttleVehicle[]): void {
    this.server.emit('shuttle-vehicles-updated', vehicles);
  }
}
