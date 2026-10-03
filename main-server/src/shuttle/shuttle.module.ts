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
