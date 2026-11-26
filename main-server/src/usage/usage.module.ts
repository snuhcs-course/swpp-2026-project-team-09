/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { posthogClient, USAGE_CLIENT_FACTORY, UsageService } from './usage.service.js';

// The main server's usage data (README.md: Usage data). Import it where an action closes, and call `UsageService.sent`
// once the work is committed.
@Module({
  imports: [UsersModule],
  providers: [UsageService, { provide: USAGE_CLIENT_FACTORY, useValue: posthogClient }],
  exports: [UsageService],
})
export class UsageModule {}
