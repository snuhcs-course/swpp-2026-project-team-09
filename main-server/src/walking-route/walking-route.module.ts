/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { WalkingRouteController } from './walking-route.controller.js';
import { FETCH_KAKAO, WalkingRouteService } from './walking-route.service.js';

@Module({
  controllers: [WalkingRouteController],
  providers: [WalkingRouteService, { provide: FETCH_KAKAO, useValue: fetch }],
})
export class WalkingRouteModule {}
