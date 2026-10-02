import { Module } from '@nestjs/common';
import { ShuttleCollector } from './shuttle.collector.js';

@Module({
  providers: [ShuttleCollector],
})
export class ShuttleModule {}
