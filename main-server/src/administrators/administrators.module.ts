/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { AdministratorsController } from './administrators.controller.js';
import { AdministratorsService } from './administrators.service.js';

@Module({
  controllers: [AdministratorsController],
  providers: [AdministratorsService],
  exports: [AdministratorsService],
})
export class AdministratorsModule {}
