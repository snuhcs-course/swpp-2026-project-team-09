/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ShuttleController } from './shuttle.controller.js';
import { ShuttleGateway } from './shuttle.gateway.js';

@Module({
  controllers: [ShuttleController],
  providers: [ShuttleGateway],
})
export class ShuttleModule {}
