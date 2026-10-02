import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { HANDLED, type Handled, WorkerMessage } from '../common/worker-message.decorator.js';
import { ShuttleRouteDto } from './dto/shuttle-route.dto.js';
import { type ShuttleStopsCollectedMessage, shuttleStopsCollectedSchema } from './dto/shuttle-stops-collected.dto.js';
import { ShuttleVehicleDto } from './dto/shuttle-vehicle.dto.js';
import {
  type ShuttleVehiclesCollectedMessage,
  shuttleVehiclesCollectedSchema,
} from './dto/shuttle-vehicles-collected.dto.js';
import { ShuttleService } from './shuttle.service.js';

@Controller('shuttle')
export class ShuttleController {
  constructor(private readonly shuttle: ShuttleService) {}

  @Get()
  route(): Promise<ShuttleRouteDto> {
    return this.shuttle.route();
  }

  @Get('vehicles')
  vehicles(): Promise<ShuttleVehicleDto[]> {
    return this.shuttle.vehicles();
  }

  @MessagePattern('shuttle-stops-collected')
  async stopsCollected(
    @WorkerMessage(shuttleStopsCollectedSchema) message: ShuttleStopsCollectedMessage,
  ): Promise<Handled> {
    await this.shuttle.storeStops(message);
    return HANDLED;
  }

  @MessagePattern('shuttle-vehicles-collected')
  async vehiclesCollected(
    @WorkerMessage(shuttleVehiclesCollectedSchema) message: ShuttleVehiclesCollectedMessage,
  ): Promise<Handled> {
    await this.shuttle.storeVehicles(message);
    return HANDLED;
  }
}
