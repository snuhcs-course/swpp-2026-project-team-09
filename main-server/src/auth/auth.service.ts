import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma.service.js';
import { Settings } from '../common/settings.js';
import { Prisma } from '../generated/prisma/client.js';
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

// Revokes the matching tokens that are not revoked yet. Call it after UsersService.lock on the tokens' User, in the
// same transaction, as refresh and sign-out do; otherwise it misses a token that a refresh is storing at that moment.
function revokeRefreshTokens(
  tx: Prisma.TransactionClient,
  where: Prisma.RefreshTokenWhereInput,
  revokedAt: Date,
): Promise<Prisma.BatchPayload> {
  return tx.refreshToken.updateMany({ where: { ...where, revokedAt: null }, data: { revokedAt } });
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
    // A revoked token goes on even when it has expired, so that a used token coming back after 30 days still revokes
    // its family.
    if (used === null || (used.revokedAt === null && used.expiresAt <= now)) {
      throw new UnauthorizedException(REFRESH_TOKEN_REFUSED);
    }
    const replacement = await this.prisma.$transaction(async (tx) => {
      // A refresh and a sign-out lock the User first, so they run one after another and each sees the tokens the one
      // before it stored. Otherwise a sign-out or a family revocation would miss a token that a refresh stores.
      await this.users.lock(used.userId, tx);
      // Of two requests with the same token, the second finds it revoked.
      const revoked = await revokeRefreshTokens(tx, { id: used.id }, now);
      if (revoked.count === 0) {
        // The token was used before. Whoever holds the other copy may have stolen it, so every token of its family is
        // revoked (RFC 9700, section 4.14.2), the one that replaced it included.
        await revokeRefreshTokens(tx, { familyId: used.familyId }, now);
        return null;
      }
      const issued = newRefreshToken();
      await tx.refreshToken.create({ data: { userId: used.userId, familyId: used.familyId, ...issued.stored } });
      return issued;
    });
    if (replacement === null) {
      throw new UnauthorizedException(REFRESH_TOKEN_REFUSED);
    }
    return { accessToken: await this.signAccessToken(used.userId), refreshToken: replacement.token };
  }

  // Revokes every refresh token of the User, on every phone, and turns the Master Switch off so that the User's
  // location is not shared after they leave. Access tokens already issued stay valid until they expire.
  async signOut(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // As a refresh does, so that a refresh under way on another phone has stored its token before the revocation.
      await this.users.lock(userId, tx);
      await revokeRefreshTokens(tx, { userId }, new Date());
      await this.users.turnOffMasterSwitch(userId, tx);
    });
  }

  private signAccessToken(userId: string): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId };
    return this.jwt.signAsync(payload);
  }
}
