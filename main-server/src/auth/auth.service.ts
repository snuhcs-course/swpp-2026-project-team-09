import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { SignedInUser } from '../common/current-user.decorator.js';
import { PrismaService } from '../common/prisma.service.js';
import { Settings } from '../common/settings.js';
import { UsersService } from '../users/users.service.js';
import { AccessTokenPayload } from './access-token.guard.js';
import { SignInResultDto } from './dto/sign-in-result.dto.js';
import { TokensDto } from './dto/tokens.dto.js';
import { GoogleIdTokenVerifier } from './google-id-token.verifier.js';
import { SessionsService } from './sessions.service.js';

// Google sets the hosted domain claim ("hd") only for accounts of a Google Workspace domain. An @snu.ac.kr email
// address alone does not prove that the account belongs to SNU's domain.
const SNU_DOMAIN = 'snu.ac.kr';
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
// A used refresh token that comes back within this time is taken as the app's retry after a lost answer.
const REFRESH_TOKEN_REUSE_GRACE_MS = 60 * 1000;
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
    private readonly sessions: SessionsService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  // Signs in with a Google ID token. The first sign-in of a Google account creates its User. A User has one session,
  // so the sign-in ends the one on the other phone.
  async signIn(idToken: string): Promise<SignInResultDto> {
    const claims = await this.googleVerifier.verify(idToken, [
      this.settings.get('GOOGLE_APP_CLIENT_ID', { infer: true }),
    ]);
    if (claims === undefined) {
      throw new UnauthorizedException('The Google ID token is invalid or expired.');
    }
    if (claims.hd !== SNU_DOMAIN) {
      throw new ForbiddenException('Sign in with an SNU Google account (snu.ac.kr).');
    }
    if (claims.email_verified !== true || claims.email === undefined) {
      throw new ForbiddenException("The Google account's email address is not verified.");
    }
    const user = await this.users.findOrCreate({
      googleSubject: claims.sub,
      email: claims.email,
      googleName: claims.name ?? '',
    });
    const refreshToken = newRefreshToken();
    const { sessionId, replacedSessionIds } = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(user.id, tx);
      const ended = await this.sessions.end(tx, { userId: user.id }, 'replaced');
      const { id } = await tx.session.create({
        data: { userId: user.id, refreshTokens: { create: refreshToken.stored } },
      });
      return { sessionId: id, replacedSessionIds: ended };
    });
    this.sessions.announceEnd(user.id, replacedSessionIds, 'replaced');
    return {
      accessToken: await this.signAccessToken(user.id, sessionId),
      refreshToken: refreshToken.token,
      onboarding: this.users.onboardingOf(user),
    };
  }

  async refresh(refreshToken: string): Promise<TokensDto> {
    const now = new Date();
    const found = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshToken) },
      select: { id: true, sessionId: true, expiresAt: true, revokedAt: true, session: { select: { userId: true } } },
    });
    // A used token goes on even when it has expired, so that one coming back after 30 days still ends its session.
    if (found === null || (found.revokedAt === null && found.expiresAt <= now)) {
      throw new UnauthorizedException(REFRESH_TOKEN_REFUSED);
    }
    const { sessionId, session } = found;
    const outcome = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(session.userId, tx);
      // Read again under the lock, after any refresh, sign-in or sign-out of the User that came first.
      const current = await tx.refreshToken.findUniqueOrThrow({
        where: { id: found.id },
        select: { revokedAt: true, session: { select: { endedAt: true } } },
      });
      if (current.session.endedAt !== null) {
        return 'refused';
      }
      if (current.revokedAt === null) {
        await tx.refreshToken.update({ where: { id: found.id }, data: { revokedAt: now } });
      } else if (now.getTime() - current.revokedAt.getTime() > REFRESH_TOKEN_REUSE_GRACE_MS) {
        // Too late for a retry: whoever holds the other copy may have stolen it (RFC 9700, section 4.14.2).
        await this.sessions.end(tx, { id: sessionId }, 'refresh_token_reused');
        return 'reused';
      }
      const issued = newRefreshToken();
      await tx.refreshToken.create({ data: { sessionId, ...issued.stored } });
      return issued;
    });
    if (outcome === 'reused') {
      this.sessions.announceEnd(session.userId, [sessionId], 'refresh_token_reused');
    }
    if (outcome === 'refused' || outcome === 'reused') {
      throw new UnauthorizedException(REFRESH_TOKEN_REFUSED);
    }
    return { accessToken: await this.signAccessToken(session.userId, sessionId), refreshToken: outcome.token };
  }

  async signOut(user: SignedInUser): Promise<void> {
    const ended = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(user.id, tx);
      return this.sessions.end(tx, { id: user.sessionId }, 'signed_out');
    });
    this.sessions.announceEnd(user.id, ended, 'signed_out');
  }

  private signAccessToken(userId: string, sessionId: string): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId };
    return this.jwt.signAsync(payload);
  }
}
