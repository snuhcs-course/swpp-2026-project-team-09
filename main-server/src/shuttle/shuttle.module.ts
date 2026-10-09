// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79, reviewed by fyoon46 in #31
import { Module } from '@nestjs/common';
import { CollectionModule } from '../collection/collection.module.js';
import { ShuttleController } from './shuttle.controller.js';
import { ShuttleService } from './shuttle.service.js';

@Module({
  imports: [CollectionModule],
  controllers: [ShuttleController],
  providers: [ShuttleService],
})
export class ShuttleModule {}
