import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Global, so that every feature module can inject PrismaService without importing this module.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
