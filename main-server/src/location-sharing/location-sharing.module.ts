// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #42
import { Module } from '@nestjs/common';
import { LocationSharingController } from './location-sharing.controller.js';
import { LocationSharingService } from './location-sharing.service.js';
import { PositionStore } from './position-store.js';
import { VisibilityService } from './visibility.service.js';

@Module({
  controllers: [LocationSharingController],
  providers: [LocationSharingService, PositionStore, VisibilityService],
  exports: [LocationSharingService, VisibilityService],
})
export class LocationSharingModule {}
