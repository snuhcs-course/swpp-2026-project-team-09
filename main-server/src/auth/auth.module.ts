import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AdministratorsModule } from '../administrators/administrators.module.js';
import { Settings } from '../common/settings.js';
import { UsersModule } from '../users/users.module.js';
import { AccessTokenGuard, USER_TOKEN_AUDIENCE } from './access-token.guard.js';
import { AdministratorAuthController } from './administrator-auth.controller.js';
import { AdministratorAuthService } from './administrator-auth.service.js';
import { AdministratorGuard } from './administrator.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleAuthLibraryVerifier } from './google-auth-library.verifier.js';
import { GoogleIdTokenVerifier } from './google-id-token.verifier.js';

@Module({
  imports: [
    UsersModule,
    AdministratorsModule,
    // Access tokens are signed with the main server's private key. The other servers verify them with the public key
    // alone. Unless a call says otherwise, a token is a User's: for the app and valid for 1 hour. An Administrator's
    // token has an audience and a lifetime of its own (administrator-auth.service.ts).
    JwtModule.registerAsync({
      useFactory: (settings: ConfigService<Settings, true>): JwtModuleOptions => ({
        privateKey: settings.get('ACCESS_TOKEN_PRIVATE_KEY', { infer: true }),
        publicKey: settings.get('ACCESS_TOKEN_PUBLIC_KEY', { infer: true }),
        signOptions: { algorithm: 'ES256', audience: USER_TOKEN_AUDIENCE, expiresIn: '1h' },
        verifyOptions: { algorithms: ['ES256'], audience: USER_TOKEN_AUDIENCE },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, AdministratorAuthController],
  providers: [
    AuthService,
    AdministratorAuthService,
    { provide: GoogleIdTokenVerifier, useClass: GoogleAuthLibraryVerifier },
    // Every route is a User's, public or an Administrator's (src/common/route-access.ts). Each guard checks the
    // routes of its own kind and lets the others through.
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: AdministratorGuard },
  ],
})
export class AuthModule {}
