/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { FETCH_EXPO } from './expo-push.js';
import { PushController } from './push.controller.js';
import { PushService } from './push.service.js';

@Module({
  controllers: [PushController],
  providers: [PushService, { provide: FETCH_EXPO, useValue: fetch }],
  exports: [PushService],
})
export class PushModule {}
