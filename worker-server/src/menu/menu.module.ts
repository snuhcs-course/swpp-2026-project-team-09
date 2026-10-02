import { Module } from '@nestjs/common';
import { MenuCollector } from './menu.collector.js';

@Module({
  providers: [MenuCollector],
})
export class MenuModule {}
