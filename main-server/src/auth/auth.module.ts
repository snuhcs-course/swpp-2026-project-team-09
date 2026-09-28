import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { Settings } from '../common/settings.js';
import { UsersModule } from '../users/users.module.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleAuthLibraryVerifier } from './google-auth-library.verifier.js';
import { GoogleIdTokenVerifier } from './google-id-token.verifier.js';

@Module({
  imports: [
    UsersModule,
    // Access tokens are valid for 1 hour and signed with the main server's private key. The other servers verify
    // them with the public key alone.
    JwtModule.registerAsync({
      useFactory: (settings: ConfigService<Settings, true>): JwtModuleOptions => ({
        privateKey: settings.get('ACCESS_TOKEN_PRIVATE_KEY', { infer: true }),
        publicKey: settings.get('ACCESS_TOKEN_PUBLIC_KEY', { infer: true }),
        signOptions: { algorithm: 'ES256', expiresIn: '1h' },
        verifyOptions: { algorithms: ['ES256'] },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: GoogleIdTokenVerifier, useClass: GoogleAuthLibraryVerifier },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
})
export class AuthModule {}
