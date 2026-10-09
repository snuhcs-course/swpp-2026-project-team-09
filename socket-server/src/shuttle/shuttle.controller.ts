/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { type ShuttleVehicle } from './dto/shuttle-vehicles-updated.dto.js';
import { ShuttleGateway } from './shuttle.gateway.js';

@Controller()
export class ShuttleController {
  constructor(private readonly gateway: ShuttleGateway) {}

  @EventPattern('shuttle-vehicles-updated')
  vehiclesUpdated(@Payload() vehicles: ShuttleVehicle[]): void {
    this.gateway.sendVehicles(vehicles);
  }
}
