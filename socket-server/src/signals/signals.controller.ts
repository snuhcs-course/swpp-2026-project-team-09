import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { type SignalEvent } from './dto/signal.dto.js';
import { SignalsGateway } from './signals.gateway.js';

@Controller()
export class SignalsController {
  constructor(private readonly gateway: SignalsGateway) {}

  @EventPattern('signal')
  signal(@Payload() event: SignalEvent): void {
    this.gateway.send(event);
  }
}
