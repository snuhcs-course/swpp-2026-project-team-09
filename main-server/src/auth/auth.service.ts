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
// One answer for every refused refresh token, so that it does not tell which check failed.
const REFRESH_TOKEN_REFUSED = 'The refresh token is invalid, expired or revoked.';

// A refresh token to hand to the User, and what is stored of it.
interface NewRefreshToken {
  token: string;
  stored: { tokenHash: string; expiresAt: Date };
}

// 32 random bytes cannot be guessed, so a fast hash is enough to keep the stored copy useless to a reader.
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Valid for 30 days from now, whether it is handed out at sign-in or by a refresh.
function newRefreshToken(): NewRefreshToken {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    stored: { tokenHash: hashRefreshToken(token), expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS) },
  };
}

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
    // The database gives the token a new family: every sign-in starts one.
    const refreshToken = newRefreshToken();
    await this.prisma.refreshToken.create({ data: { userId: user.id, ...refreshToken.stored } });
    return { accessToken: await this.signAccessToken(user.id), refreshToken: refreshToken.token };
  }

  // Exchanges a refresh token for new tokens. The used token is revoked, and a new one of its family replaces it.
  async refresh(refreshToken: string): Promise<TokensDto> {
    const now = new Date();
    const used = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(refreshToken) } });
    if (used === null || used.expiresAt <= now) {
      throw new UnauthorizedException(REFRESH_TOKEN_REFUSED);
    }
    if (used.revokedAt === null) {
      const replacement = newRefreshToken();
      // The revocation matches only a token that is not revoked yet, and PostgreSQL checks that again after waiting
      // for a concurrent revocation of the same row. Of two requests with the same token, only one revokes it.
      const [revoked] = await this.prisma.$transaction([
        this.prisma.refreshToken.updateMany({ where: { id: used.id, revokedAt: null }, data: { revokedAt: now } }),
        this.prisma.refreshToken.create({
          data: { userId: used.userId, familyId: used.familyId, ...replacement.stored },
        }),
      ]);
      if (revoked.count === 1) {
        return { accessToken: await this.signAccessToken(used.userId), refreshToken: replacement.token };
      }
    }
    // The token was used before. Whoever holds the other copy may have stolen it, so every token of its family is
    // revoked (RFC 9700, section 4.14.2), the replacements of both requests included when two arrived at once.
    await this.prisma.refreshToken.updateMany({
      where: { familyId: used.familyId, revokedAt: null },
      data: { revokedAt: now },
    });
    throw new UnauthorizedException(REFRESH_TOKEN_REFUSED);
  }

  // Revokes every refresh token of the User, on every phone, and turns the Master Switch off so that the User's
  // location is not shared after they leave. Access tokens already issued stay valid until they expire.
  async signOut(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.user.update({ where: { id: userId }, data: { masterSwitch: false } }),
    ]);
  }

  private signAccessToken(userId: string): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId };
    return this.jwt.signAsync(payload);
  }
}
