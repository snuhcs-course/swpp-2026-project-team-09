// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by TaeHyun79, reviewed by fyoon46 in #5
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
