import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { Settings } from '../common/settings.js';
import { UsersGateway } from './users.gateway.js';

// The audience of a User's access token, as the main server signs it. An Administrator's token has another, so it is
// refused here.
const USER_TOKEN_AUDIENCE = 'snu-now-app';

@Module({
  imports: [
    // The main server signs access tokens with its private key. The socket server verifies them with the public key
    // alone, without asking the main server.
    JwtModule.registerAsync({
      useFactory: (settings: ConfigService<Settings, true>): JwtModuleOptions => ({
        publicKey: settings.get('ACCESS_TOKEN_PUBLIC_KEY', { infer: true }),
        verifyOptions: { algorithms: ['ES256'], audience: USER_TOKEN_AUDIENCE },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [UsersGateway],
})
export class UsersModule {}
