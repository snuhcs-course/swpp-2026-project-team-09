import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdministratorsService } from '../administrators/administrators.service.js';
import { Settings } from '../common/settings.js';
import { ADMINISTRATOR_TOKEN_AUDIENCE, AdministratorTokenPayload } from './administrator.guard.js';
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

  // Signs in to the admin site with a Google ID token issued to the admin site's client, from any Google domain.
  // The access token is valid for 8 hours, a working day, and comes without a refresh token: when it expires, the
  // admin site sends the person through Sign in with Google again.
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

  // Ends every access token issued to the Administrator so far, in every browser. A new sign-in works afterwards.
  async signOut(administratorId: string): Promise<void> {
    await this.administrators.endTokens(administratorId);
  }
}
