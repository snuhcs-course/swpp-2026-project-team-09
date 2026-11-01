/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { GlobalEvent, LinkedSession, QueuedSession } from '@/main-server';

import type * as MainServerModule from '@/main-server';

import { FakeSameEvent } from './fake-same-event';

const { MainServerError } = await vi.importActual<typeof MainServerModule>('@/main-server');

// The main server's routes over them, apart from the fake's others.
export abstract class SameEventRoutes {
  readonly sameEvent = new FakeSameEvent();

  abstract storedEvent(id: string): GlobalEvent | undefined;

  protected abstract answer<T>(request: string, token: string, work: () => T): Promise<T>;

  listLinkedSessions = (token: string, id: string): Promise<LinkedSession[]> =>
    this.answer(`GET /admin/global-events/${id}/sessions`, token, () => {
      // As the main server does for an id that is not a UUID.
      if (this.storedEvent(id) === undefined) {
        throw new MainServerError(400);
      }
      return this.sameEvent.linkedTo(id);
    });

  acknowledgeGlobalEvent = (token: string, id: string): Promise<void> =>
    this.answer(`POST /admin/global-events/${id}/acknowledge`, token, () => {
      const event = this.storedEvent(id);
      if (event !== undefined) {
        event.needsAdministrator = false;
      }
    });

  detachSession = (token: string, sessionId: string): Promise<void> =>
    this.answer(`POST /admin/global-events/sessions/${sessionId}/detach`, token, () => {
      this.sameEvent.detach(sessionId);
    });

  listSameEventQueue = (token: string): Promise<QueuedSession[]> =>
    this.answer('GET /admin/global-events/queue', token, () => this.sameEvent.queue());

  attachQueuedSession = (token: string, sessionId: string, version: number, globalEventId: string): Promise<void> =>
    this.answer(`POST /admin/global-events/queue/${sessionId}/attach ${globalEventId}`, token, () => {
      this.sameEvent.leaveQueue(sessionId, version);
    });

  publishQueuedSession = (token: string, sessionId: string, version: number): Promise<void> =>
    this.answer(`POST /admin/global-events/queue/${sessionId}/publish`, token, () => {
      this.sameEvent.publish(sessionId, version);
    });
}
