import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MESSAGING_CLIENT } from '../common/messaging.module.js';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma, Session, SessionEndReason } from '../generated/prisma/client.js';

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
  ) {}

  find(id: string): Promise<Pick<Session, 'endedAt' | 'endReason'> | null> {
    return this.prisma.session.findUnique({ where: { id }, select: { endedAt: true, endReason: true } });
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

  // Call it once the transaction that ended the sessions has committed. The answer does not wait for it: the database
  // already refuses the sessions, and the event only closes their socket connections sooner.
  announceEnd(sessionIds: readonly string[], reason: SessionEndReason): void {
    for (const sessionId of sessionIds) {
      const event: SessionEndedEvent = { sessionId, reason };
      this.messaging.emit('session-ended', event).subscribe({
        error: (error: unknown) => {
          this.logger.warn(`The socket server was not told that session ${sessionId} ended: ${String(error)}`);
        },
      });
    }
  }
}
