// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-09-29 to 2026-10-08, prompted by fyoon46, reviewed by TaeHyun79 in #14
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdministratorsService } from '../administrators/administrators.service.js';
import { Settings } from '../common/settings.js';
import { ADMINISTRATOR_TOKEN_AUDIENCE, AdministratorTokenPayload } from './administrator.guard.js';
import { AdministratorAccountDto } from './dto/administrator-account.dto.js';
import { AdministratorTokenDto } from './dto/administrator-token.dto.js';
import { GoogleIdTokenVerifier } from './google-id-token.verifier.js';

@Injectable()
export class AdministratorAuthService {
  constructor(
    private readonly googleVerifier: GoogleIdTokenVerifier,
    private readonly administrators: AdministratorsService,
    private readonly jwt: JwtService,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  // Unlike the app's sign-in, any Google domain is accepted: an Administrator's account may be outside SNU.
  async signIn(idToken: string): Promise<AdministratorTokenDto> {
    const claims = await this.googleVerifier.verify(idToken, [
      this.settings.get('GOOGLE_ADMIN_CLIENT_ID', { infer: true }),
    ]);
    if (claims === undefined) {
      throw new UnauthorizedException('The Google ID token is invalid or expired.');
    }
    if (claims.email_verified !== true || claims.email === undefined) {
      throw new ForbiddenException("The Google account's email address is not verified.");
    }
    const administrator = await this.administrators.findForSignIn(claims.sub, claims.email);
    if (administrator === null) {
      throw new ForbiddenException('Only a registered Administrator can sign in.');
    }
    const payload: Pick<AdministratorTokenPayload, 'sub'> = { sub: administrator.id };
    return {
      accessToken: await this.jwt.signAsync(payload, { audience: ADMINISTRATOR_TOKEN_AUDIENCE, expiresIn: '8h' }),
    };
  }

  // Removed since the guard read them: refused as the guard would.
  async account(administratorId: string): Promise<AdministratorAccountDto> {
    const administrator = await this.administrators.findById(administratorId);
    if (administrator === null) {
      throw new UnauthorizedException();
    }
    return { id: administrator.id, email: administrator.email };
  }

  async signOut(administratorId: string): Promise<void> {
    await this.administrators.endTokens(administratorId);
  }
}
