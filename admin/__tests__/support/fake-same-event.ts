/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { LinkedSession, QueuedSession } from '@/main-server';
import type * as MainServerModule from '@/main-server';

const { MainServerError } = await vi.importActual<typeof MainServerModule>('@/main-server');

// The main server's queue of undecided sessions and the sessions linked to events.
export class FakeSameEvent {
  private queued: QueuedSession[] = [];
  private readonly linked = new Map<string, LinkedSession[]>();

  reset(): void {
    this.queued = [];
    this.linked.clear();
  }

  hasQueued(...sessions: QueuedSession[]): void {
    this.queued.push(...sessions);
  }

  hasLinked(eventId: string, ...sessions: LinkedSession[]): void {
    this.linked.set(eventId, sessions);
  }

  queue(): QueuedSession[] {
    return this.queued;
  }

  linkedTo(eventId: string): LinkedSession[] {
    return this.linked.get(eventId) ?? [];
  }

  detach(sessionId: string): void {
    for (const [eventId, sessions] of this.linked) {
      if (sessions.some((each) => each.sessionId === sessionId && each.detachable)) {
        this.linked.set(
          eventId,
          sessions.filter((each) => each.sessionId !== sessionId),
        );
        return;
      }
    }
    throw new MainServerError(409, { code: 'SESSION_NOT_DETACHABLE' });
  }

  publish(sessionId: string, version: number): void {
    const { draft } = this.session(sessionId);
    if (draft.missing.length > 0) {
      throw new MainServerError(409, { code: 'GLOBAL_EVENT_INCOMPLETE', missing: draft.missing });
    }
    this.leaveQueue(sessionId, version);
  }

  leaveQueue(sessionId: string, version: number): void {
    if (this.session(sessionId).draft.version !== version) {
      throw new MainServerError(409, { code: 'GLOBAL_EVENT_CHANGED' });
    }
    this.queued = this.queued.filter((each) => each.sessionId !== sessionId);
  }

  private session(sessionId: string): QueuedSession {
    const session = this.queued.find((each) => each.sessionId === sessionId);
    if (session === undefined) {
      throw new MainServerError(409, { code: 'SESSION_NOT_QUEUED' });
    }
    return session;
  }
}
