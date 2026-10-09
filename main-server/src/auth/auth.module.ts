// AI-generated with Claude Opus 5.5, 2026-09-29 to 2026-10-06, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #5 #9 #13 #14 #31 #42 #48
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AdministratorsModule } from '../administrators/administrators.module.js';
import { Settings } from '../common/settings.js';
import { LocationSharingModule } from '../location-sharing/location-sharing.module.js';
import { UsersModule } from '../users/users.module.js';
import { AccessTokenGuard, USER_TOKEN_AUDIENCE } from './access-token.guard.js';
import { AdministratorAuthController } from './administrator-auth.controller.js';
import { AdministratorAuthService } from './administrator-auth.service.js';
import { AdministratorGuard } from './administrator.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleAuthLibraryVerifier } from './google-auth-library.verifier.js';
import { GoogleIdTokenVerifier } from './google-id-token.verifier.js';
import { MatchServerGuard } from './match-server.guard.js';
import { SessionsService } from './sessions.service.js';
import { WorkerGuard } from './worker.guard.js';

@Module({
  imports: [
    UsersModule,
    AdministratorsModule,
    LocationSharingModule,
    // Access tokens are signed with the main server's private key. The other servers verify them with the public key
    // alone. The defaults are a User's token; the Administrator's sign-in and guard pass their own audience.
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
    SessionsService,
    { provide: GoogleIdTokenVerifier, useClass: GoogleAuthLibraryVerifier },
    // Each guard checks only its own kind of route (src/common/route-access.ts), so their order does not matter.
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: AdministratorGuard },
    { provide: APP_GUARD, useClass: WorkerGuard },
    { provide: APP_GUARD, useClass: MatchServerGuard },
  ],
})
export class AuthModule {}
