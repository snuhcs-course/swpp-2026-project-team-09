/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readReply, scriptFor } from './call-script';
import { isLibraryPage, isOnLibrarySite, LIBRARY_LOGOUT_URL, LIBRARY_MAIN_URL, type LibraryEndpoint } from './site';
import type { LibraryTransport, TransportReply } from './transport';

// How long the hidden view's page may take to load, and each call.
export const PAGE_LOAD_MS = 20_000;
export const CALL_MS = 15_000;
// The logout URL's page, with the same limit as a call.
export const LOGOUT_MS = 15_000;

// What the transport needs of the mounted hidden web view (`hidden-view.tsx`).
export interface HiddenViewHandle {
  inject: (script: string) => void;
  load: (url: string) => void;
}

type PageState = 'detached' | 'loading' | 'ready' | 'failed' | 'ended';

type Readiness = 'ready' | 'sessionEnded' | 'network';

let lastId = 0;

function freshId(): string {
  lastId += 1;
  return `${Date.now().toString(36)}-${String(lastId)}-${Math.random().toString(36).slice(2, 8)}`;
}

// The library calls through the hidden web view. Each call waits for the view's page, injects the fixed script with
// a fresh id, and waits for the reply with that id. A call or page that takes too long counts as `network`; nothing
// here retries a call. The view's events come in through `attach`, `loaded`, `loadFailed`, `received` and `detach`.
export class HiddenViewTransport implements LibraryTransport {
  private handle: HiddenViewHandle | null = null;
  private page: PageState = 'detached';
  private readonly waiters = new Set<(readiness: Readiness) => void>();
  private readonly pending = new Map<string, (reply: TransportReply) => void>();
  // The logout in progress: whether its URL was asked of the view yet, and how it ends.
  private logoutDone: ((loaded: boolean) => void) | null = null;
  private logoutAsked = false;

  attach(handle: HiddenViewHandle): void {
    this.handle = handle;
    this.page = 'loading';
    if (this.logoutDone !== null && !this.logoutAsked) {
      this.logoutAsked = true;
      handle.load(LIBRARY_LOGOUT_URL);
    }
  }

  // The view is gone: the flag was cleared, so the session has ended for every call still waiting.
  detach(): void {
    this.handle = null;
    this.page = 'detached';
    this.settleWaiters('sessionEnded');
    this.settlePending({ ok: false, error: 'sessionEnded' });
    this.endLogout(false);
  }

  // A page finished loading. Anywhere off the booking site's screens, the session has ended.
  loaded(url: string): void {
    if (this.logoutDone !== null) {
      if (this.logoutAsked) {
        this.page = 'ended';
        this.endLogout(true);
      }
      return;
    }
    if (isLibraryPage(url)) {
      this.page = 'ready';
      this.settleWaiters('ready');
      return;
    }
    this.page = 'ended';
    this.settleWaiters('sessionEnded');
    this.settlePending({ ok: false, error: 'sessionEnded' });
  }

  loadFailed(): void {
    if (this.logoutDone !== null) {
      if (this.logoutAsked) {
        this.endLogout(false);
      }
      return;
    }
    this.page = 'failed';
    this.settleWaiters('network');
  }

  // A message from the view. Only a reply with a pending id, from a page of the site, is taken.
  received(data: string, url: string): void {
    if (!isOnLibrarySite(url)) {
      return;
    }
    const reply = readReply(data);
    if (reply === null) {
      return;
    }
    const settle = this.pending.get(reply.id);
    if (settle === undefined) {
      return;
    }
    settle(reply.ok ? { ok: true, result: reply.result } : { ok: false, error: reply.error });
  }

  async call(endpoint: LibraryEndpoint, body: Readonly<Record<string, string>>): Promise<TransportReply> {
    const readiness = await this.whenReady();
    const handle = this.handle;
    if (readiness !== 'ready' || handle === null) {
      return { ok: false, error: readiness === 'ready' ? 'sessionEnded' : readiness };
    }
    const id = freshId();
    return new Promise<TransportReply>((resolve) => {
      const timer = setTimeout(() => {
        settle({ ok: false, error: 'network' });
      }, CALL_MS);
      const settle = (reply: TransportReply): void => {
        clearTimeout(timer);
        this.pending.delete(id);
        resolve(reply);
      };
      this.pending.set(id, settle);
      handle.inject(scriptFor({ id, endpoint, body }));
    });
  }

  logout(): Promise<boolean> {
    this.endLogout(false);
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.endLogout(false);
      }, LOGOUT_MS);
      this.logoutDone = (loaded: boolean): void => {
        clearTimeout(timer);
        resolve(loaded);
      };
      this.logoutAsked = false;
      if (this.handle !== null) {
        this.logoutAsked = true;
        this.handle.load(LIBRARY_LOGOUT_URL);
      }
    });
  }

  private endLogout(loaded: boolean): void {
    const done = this.logoutDone;
    this.logoutDone = null;
    this.logoutAsked = false;
    done?.(loaded);
  }

  // The page the calls run on, loaded once. A page that failed to load is loaded again for the next call.
  private whenReady(): Promise<Readiness> {
    if (this.page === 'ready') {
      return Promise.resolve('ready');
    }
    if (this.page === 'ended') {
      return Promise.resolve('sessionEnded');
    }
    if (this.page === 'failed' && this.handle !== null) {
      this.page = 'loading';
      this.handle.load(LIBRARY_MAIN_URL);
    }
    return new Promise<Readiness>((resolve) => {
      const timer = setTimeout(() => {
        settle('network');
        if (this.page === 'loading') {
          this.page = 'failed';
        }
      }, PAGE_LOAD_MS);
      const settle = (readiness: Readiness): void => {
        clearTimeout(timer);
        this.waiters.delete(settle);
        resolve(readiness);
      };
      this.waiters.add(settle);
    });
  }

  private settleWaiters(readiness: Readiness): void {
    for (const settle of this.waiters) {
      settle(readiness);
    }
  }

  private settlePending(reply: TransportReply): void {
    for (const settle of this.pending.values()) {
      settle(reply);
    }
  }
}
