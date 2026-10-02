import { Module } from '@nestjs/common';
import { EventCollector } from './event.collector.js';

@Module({
  providers: [EventCollector],
})
export class EventModule {}
