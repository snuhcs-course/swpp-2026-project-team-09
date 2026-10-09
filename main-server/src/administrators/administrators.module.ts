// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by fyoon46, reviewed by TaeHyun79 in #14
import { Module } from '@nestjs/common';
import { AdministratorsController } from './administrators.controller.js';
import { AdministratorsService } from './administrators.service.js';

@Module({
  controllers: [AdministratorsController],
  providers: [AdministratorsService],
  exports: [AdministratorsService],
})
export class AdministratorsModule {}
