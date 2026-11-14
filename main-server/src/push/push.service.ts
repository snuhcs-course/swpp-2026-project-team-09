/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { type AnswerReading, EXPO_PUSH_SEND, FETCH_EXPO, readAnswer, requestFailure } from './expo-push.js';
import { type PushMessage } from './messages.js';

// Expo takes at most 100 messages in one request.
const CHUNK_SIZE = 100;

// Without a limit of its own, fetch waits 300 seconds for an answer.
const EXPO_TIMEOUT_MS = 5000;

interface TokenRow {
  id: string;
  token: string;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// The one sender of pushes. Nothing is retried and receipts are not read (see README.md, Push notifications).
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly inFlight = new Set<Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FETCH_EXPO) private readonly fetchExpo: typeof fetch,
  ) {}

  // Two registrations of the same token at once can collide on the unique token; the second try finds the row.
  async register(sessionId: string, token: string): Promise<void> {
    try {
      await this.store(sessionId, token);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      await this.store(sessionId, token);
    }
  }

  // Never throws, and the caller does not wait for it.
  send(userIds: readonly string[], message: PushMessage): Promise<void> {
    const sending = this.deliver(userIds, message)
      // Only the error's name: a database error's message can quote a token.
      .catch((error: unknown) => {
        this.logger.warn(`A push was not sent: ${error instanceof Error ? error.name : typeof error}`);
      })
      .finally(() => {
        this.inFlight.delete(sending);
      });
    this.inFlight.add(sending);
    return sending;
  }

  // For tests: resolves once no send is in flight.
  async settled(): Promise<void> {
    if (this.inFlight.size > 0) {
      await Promise.all(this.inFlight);
      await this.settled();
    }
  }

  private store(sessionId: string, token: string): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      await tx.pushToken.deleteMany({ where: { token, sessionId: { not: sessionId } } });
      await tx.pushToken.upsert({ where: { sessionId }, create: { sessionId, token }, update: { token } });
    });
  }

  private async deliver(userIds: readonly string[], message: PushMessage): Promise<void> {
    if (userIds.length === 0) {
      return;
    }
    // A Session whose refresh token expired is never marked ended, so it counts only while it can still refresh.
    const rows = await this.prisma.pushToken.findMany({
      where: {
        session: {
          userId: { in: [...userIds] },
          endedAt: null,
          refreshTokens: { some: { revokedAt: null, expiresAt: { gt: new Date() } } },
        },
      },
      select: { id: true, token: true },
    });
    const chunks: TokenRow[][] = [];
    for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
      chunks.push(rows.slice(start, start + CHUNK_SIZE));
    }
    await Promise.all(chunks.map((chunk) => this.post(chunk, message)));
  }

  private async post(rows: readonly TokenRow[], message: PushMessage): Promise<void> {
    let reading: AnswerReading;
    try {
      const response = await this.fetchExpo(EXPO_PUSH_SEND, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(
          rows.map(({ token }) => ({
            to: token,
            title: message.title,
            body: message.body,
            data: { url: message.url },
            channelId: 'default',
            priority: 'high',
          })),
        ),
        signal: AbortSignal.timeout(EXPO_TIMEOUT_MS),
      });
      const body: unknown = await response.json().catch(() => null);
      reading = readAnswer(response.status, body, rows);
    } catch (error) {
      reading = { dropped: [], logs: [requestFailure(error)] };
    }
    for (const { level, text } of reading.logs) {
      this.logger[level](text);
    }
    if (reading.dropped.length > 0) {
      // A row whose Session registered another token while Expo answered keeps the new token.
      const dropped = rows.filter(({ id }) => reading.dropped.includes(id)).map(({ id, token }) => ({ id, token }));
      await this.prisma.pushToken.deleteMany({ where: { OR: dropped } });
    }
  }
}
