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
import { SessionsService } from './sessions.service.js';
import { WorkerGuard } from './worker.guard.js';

@Module({
  imports: [
    UsersModule,
    AdministratorsModule,
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
  ],
})
export class AuthModule {}
