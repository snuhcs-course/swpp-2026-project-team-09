/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { Settings } from '../common/settings.js';
import { accessTokenOptions } from './access-token.js';
import { UsersController } from './users.controller.js';
import { UsersGateway } from './users.gateway.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (settings: ConfigService<Settings, true>): JwtModuleOptions =>
        accessTokenOptions(settings.get('ACCESS_TOKEN_PUBLIC_KEY', { infer: true })),
      inject: [ConfigService],
    }),
  ],
  controllers: [UsersController],
  providers: [UsersGateway],
})
export class UsersModule {}
