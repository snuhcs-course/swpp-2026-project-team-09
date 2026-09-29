import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Redis } from 'ioredis';
import { lastValueFrom } from 'rxjs';
import { MESSAGING_CLIENT } from '../common/messaging.module.js';
import { REDIS } from '../common/redis.module.js';

// An ended session is recorded as long as an access token is valid, so that its access tokens expire before the record.
export const ACCESS_TOKEN_LIFETIME_SECONDS = 60 * 60;

// How a session ended: a sign-in on another phone replaced it, or a sign-out or a used refresh token that came back
// ended it.
export type SessionEnd = 'replaced' | 'ended';

const SESSION_ENDED = 'session-ended';

interface SessionEndedEvent {
  sessionId: string;
  end: SessionEnd;
}

// The socket server reads the same keys.
function key(sessionId: string): string {
  return `ended-session:${sessionId}`;
}

// Access tokens are checked without the database, so ended sessions are recorded in Redis for the guard and the
// socket server. The socket server checks a token only when a connection opens, so an event tells it to disconnect the
// connections already open.
@Injectable()
export class EndedSessions {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(MESSAGING_CLIENT) private readonly messaging: ClientProxy,
  ) {}

  async record(sessionIds: readonly string[], end: SessionEnd): Promise<void> {
    await Promise.all(
      sessionIds.map((sessionId) => this.redis.set(key(sessionId), end, 'EX', ACCESS_TOKEN_LIFETIME_SECONDS)),
    );
    // Sent after the records, so that a connection that opens once the event has been handled is refused by them.
    await Promise.all(
      sessionIds.map((sessionId) => {
        const event: SessionEndedEvent = { sessionId, end };
        return lastValueFrom(this.messaging.emit(SESSION_ENDED, event), { defaultValue: undefined });
      }),
    );
  }

  async find(sessionId: string): Promise<SessionEnd | undefined> {
    const end = await this.redis.get(key(sessionId));
    if (end === null) {
      return undefined;
    }
    return end === 'replaced' ? 'replaced' : 'ended';
  }
}
