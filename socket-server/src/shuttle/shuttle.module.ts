// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79, reviewed by fyoon46 in #31
import { Module } from '@nestjs/common';
import { ShuttleController } from './shuttle.controller.js';
import { ShuttleGateway } from './shuttle.gateway.js';

@Module({
  controllers: [ShuttleController],
  providers: [ShuttleGateway],
})
export class ShuttleModule {}
