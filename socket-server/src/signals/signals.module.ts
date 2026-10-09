/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { SignalsController } from './signals.controller.js';
import { SignalsGateway } from './signals.gateway.js';

@Module({
  controllers: [SignalsController],
  providers: [SignalsGateway],
})
export class SignalsModule {}
