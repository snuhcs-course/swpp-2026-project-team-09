import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { type SessionEndedEvent } from './dto/session-ended.dto.js';
import { UsersGateway } from './users.gateway.js';

@Controller()
export class UsersController {
  constructor(private readonly gateway: UsersGateway) {}

  // A connection is checked only when it opens, so the connections already open when a session ends are closed here.
  @EventPattern('session-ended')
  sessionEnded(@Payload() event: SessionEndedEvent): void {
    this.gateway.endSession(event.sessionId, event.end);
  }
}
