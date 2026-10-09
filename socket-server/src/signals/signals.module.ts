// AI-generated with Claude Fable 5.1, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #38
import { Module } from '@nestjs/common';
import { SignalsController } from './signals.controller.js';
import { SignalsGateway } from './signals.gateway.js';

@Module({
  controllers: [SignalsController],
  providers: [SignalsGateway],
})
export class SignalsModule {}
