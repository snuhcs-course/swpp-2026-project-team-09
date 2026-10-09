// AI-generated with Claude Opus 5.5, 2026-10-02, prompted by TaeHyun79, reviewed by fyoon46 in #28
import { Module } from '@nestjs/common';
import { WalkingRouteController } from './walking-route.controller.js';
import { FETCH_KAKAO, WalkingRouteService } from './walking-route.service.js';

@Module({
  controllers: [WalkingRouteController],
  providers: [WalkingRouteService, { provide: FETCH_KAKAO, useValue: fetch }],
})
export class WalkingRouteModule {}
