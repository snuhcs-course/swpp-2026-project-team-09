// AI-generated with Claude Opus 5.5, 2026-09-30 to 2026-10-06, prompted by fyoon46, reviewed by fyoon46 and TaeHyun79 in #9 #18 #42
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MESSAGING_CLIENT } from '../common/messaging.module.js';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma, Session, SessionEndReason } from '../generated/prisma/client.js';
import { LocationSharingService } from '../location-sharing/location-sharing.service.js';
import { OnboardingSource } from '../users/dto/onboarding.dto.js';

type SessionWithUser = Pick<Session, 'endedAt' | 'endReason'> & { user: OnboardingSource };

// The socket server reads the same event.
interface SessionEndedEvent {
  sessionId: string;
  reason: SessionEndReason;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGING_CLIENT) private readonly messaging: ClientProxy,
    private readonly locationSharing: LocationSharingService,
  ) {}

  // With what the onboarding check needs of its User, in the same query.
  find(id: string): Promise<SessionWithUser | null> {
    return this.prisma.session.findUnique({
      where: { id },
      select: { endedAt: true, endReason: true, user: { select: { onboardedAt: true, googleName: true } } },
    });
  }

  // Call it after UsersService.lock on their User, in the same transaction.
  async end(
    tx: Prisma.TransactionClient,
    where: Prisma.SessionWhereInput,
    reason: SessionEndReason,
  ): Promise<string[]> {
    const endedAt = new Date();
    const ended = await tx.session.updateManyAndReturn({
      where: { ...where, endedAt: null },
      data: { endedAt, endReason: reason },
      select: { id: true },
    });
    const sessionIds = ended.map(({ id }) => id);
    await tx.refreshToken.updateMany({
      where: { sessionId: { in: sessionIds }, revokedAt: null },
      data: { revokedAt: endedAt },
    });
    return sessionIds;
  }

  // Call it once the transaction that ended the User's sessions has committed. Also clears the User's position, so that
  // the phone's last position does not linger. The answer waits for neither: the database already refuses the sessions,
  // and a sign-in or sign-out works while Redis is down.
  announceEnd(userId: string, sessionIds: readonly string[], reason: SessionEndReason): void {
    if (sessionIds.length === 0) {
      return;
    }
    for (const sessionId of sessionIds) {
      const event: SessionEndedEvent = { sessionId, reason };
      this.messaging.emit('session-ended', event).subscribe({
        error: (error: unknown) => {
          this.logger.warn(`The socket server was not told that session ${sessionId} ended: ${String(error)}`);
        },
      });
    }
    this.locationSharing.clearPosition(userId).catch((error: unknown) => {
      this.logger.warn(`The position of User ${userId} was not cleared at the end of a session: ${String(error)}`);
    });
  }
}
