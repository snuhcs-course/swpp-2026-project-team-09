import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { type ShuttleVehicle } from './dto/shuttle-vehicles-updated.dto.js';
import { ShuttleGateway } from './shuttle.gateway.js';

@Controller()
export class ShuttleController {
  constructor(private readonly gateway: ShuttleGateway) {}

  // The main server sends each set of vehicles it stores.
  @EventPattern('shuttle-vehicles-updated')
  vehiclesUpdated(@Payload() vehicles: ShuttleVehicle[]): void {
    this.gateway.sendVehicles(vehicles);
  }
}
