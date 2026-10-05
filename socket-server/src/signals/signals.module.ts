import { Module } from '@nestjs/common';
import { SignalsController } from './signals.controller.js';
import { SignalsGateway } from './signals.gateway.js';

@Module({
  controllers: [SignalsController],
  providers: [SignalsGateway],
})
export class SignalsModule {}
