// AI-generated with Claude Opus 5.5, 2026-10-02, prompted by TaeHyun79, reviewed by fyoon46 in #28
import { Controller, Get, Header, Query } from '@nestjs/common';
import { type WalkingRouteQuery, walkingRouteQuerySchema } from './dto/walking-route-query.dto.js';
import { WalkingRouteAnswerDto } from './dto/walking-route.dto.js';
import { WalkingRouteService } from './walking-route.service.js';

@Controller('walking-route')
export class WalkingRouteController {
  constructor(private readonly walkingRoute: WalkingRouteService) {}

  // Kakao's policy forbids keeping a route: every request asks Kakao, and no cache along the way may keep the answer.
  @Get()
  @Header('Cache-Control', 'no-store')
  find(@Query({ schema: walkingRouteQuerySchema }) query: WalkingRouteQuery): Promise<WalkingRouteAnswerDto> {
    return this.walkingRoute.find(query);
  }
}
