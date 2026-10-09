// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79, reviewed by fyoon46 in #31
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
