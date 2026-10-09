// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by TaeHyun79, reviewed by fyoon46 in #4
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Global, so that every feature module can inject PrismaService without importing this module.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
