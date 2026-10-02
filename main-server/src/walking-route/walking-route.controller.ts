import { Controller, Get, Header, Query } from '@nestjs/common';
import { type WalkingRouteQuery, walkingRouteQuerySchema } from './dto/walking-route-query.dto.js';
import { WalkingRouteDto } from './dto/walking-route.dto.js';
import { WalkingRouteService } from './walking-route.service.js';

@Controller('walking-route')
export class WalkingRouteController {
  constructor(private readonly walkingRoute: WalkingRouteService) {}

  // Kakao's policy forbids keeping a route, so no cache along the way may keep one either.
  @Get()
  @Header('Cache-Control', 'no-store')
  find(@Query({ schema: walkingRouteQuerySchema }) query: WalkingRouteQuery): Promise<WalkingRouteDto> {
    return this.walkingRoute.find(query);
  }
}
