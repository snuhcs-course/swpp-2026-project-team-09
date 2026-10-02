import { Module } from '@nestjs/common';
import { WalkingRouteController } from './walking-route.controller.js';
import { FETCH, WalkingRouteService } from './walking-route.service.js';

@Module({
  controllers: [WalkingRouteController],
  providers: [WalkingRouteService, { provide: FETCH, useValue: fetch }],
})
export class WalkingRouteModule {}
