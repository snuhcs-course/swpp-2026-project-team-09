import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { WorkerOnly } from '../common/worker-only.decorator.js';
import { ShuttleRouteDto } from './dto/shuttle-route.dto.js';
import { type ShuttleStopsCollectedMessage, shuttleStopsCollectedSchema } from './dto/shuttle-stops-collected.dto.js';
import { type ShuttleVehicleDto } from './dto/shuttle-vehicle.dto.js';
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

  @Post('stops/collected')
  @WorkerOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async stopsCollected(
    @Body({ schema: shuttleStopsCollectedSchema }) message: ShuttleStopsCollectedMessage,
  ): Promise<void> {
    await this.shuttle.storeStops(message);
  }

  @Post('vehicles/collected')
  @WorkerOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async vehiclesCollected(
    @Body({ schema: shuttleVehiclesCollectedSchema }) message: ShuttleVehiclesCollectedMessage,
  ): Promise<void> {
    await this.shuttle.storeVehicles(message);
  }
}
