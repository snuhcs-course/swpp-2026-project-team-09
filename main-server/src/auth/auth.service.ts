import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma.service.js';
import { Settings } from '../common/settings.js';
import { UsersService } from '../users/users.service.js';
import { AccessTokenPayload } from './access-token.guard.js';
import { TokensDto } from './dto/tokens.dto.js';
import { GoogleIdTokenVerifier } from './google-id-token.verifier.js';

// Google sets the hosted domain claim ("hd") only for accounts of a Google Workspace domain. An @snu.ac.kr email
// address alone does not prove that the account belongs to SNU's domain.
const SNU_DOMAIN = 'snu.ac.kr';
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly googleVerifier: GoogleIdTokenVerifier,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  // Signs in with a Google ID token. The first sign-in of a Google account creates its User.
  async signIn(idToken: string): Promise<TokensDto> {
    const claims = await this.googleVerifier.verify(idToken, this.settings.get('GOOGLE_CLIENT_IDS', { infer: true }));
    if (claims === undefined) {
      throw new UnauthorizedException('The Google ID token is invalid or expired.');
    }
    if (claims.hd !== SNU_DOMAIN) {
      throw new ForbiddenException('Sign in with an SNU Google account (snu.ac.kr).');
    }
    if (claims.email_verified !== true || claims.email === undefined) {
      throw new ForbiddenException("The Google account's email address is not verified.");
    }
    const user = await this.users.findOrCreate(claims.sub, claims.email);
    const payload: AccessTokenPayload = { sub: user.id };
    return {
      accessToken: await this.jwt.signAsync(payload),
      refreshToken: await this.createRefreshToken(user.id),
    };
  }

  // 32 random bytes cannot be guessed, so a fast hash is enough to keep the stored copy useless to a reader.
  private async createRefreshToken(userId: string): Promise<string> {
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
      },
    });
    return refreshToken;
  }
}
