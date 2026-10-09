/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type {
  AdminFriend,
  Administrator,
  AdminUser,
  CollectionStatus,
  GlobalEvent,
  GlobalEventChange,
  ListedGlobalEvent,
  MainServer,
  Place,
} from '@/main-server';
import type * as MainServerModule from '@/main-server';

import { FakeUsers } from './fake-users';
import {
  byStart,
  FakeCreations,
  missingFor,
  newEvent,
  refused,
  refuseFields,
  TRANSITIONS,
  withMissing,
} from './fake-global-events';

// The setup file replaces '@/main-server' with this fake, so the real error class comes from the actual module.
const { MainServerError } = await vi.importActual<typeof MainServerModule>('@/main-server');

interface Account extends Administrator {
  tokens: Set<string>;
}

// Behaves like the main server's administrator routes, and records each request as "METHOD /path".
class FakeMainServer implements MainServer {
  requests: string[] = [];
  private accounts: Account[] = [];
  private issued = 0;
  private events: GlobalEvent[] = [];
  private places: Place[] = [];
  creations = new FakeCreations();
  private statuses: CollectionStatus[] = [];
  readonly users = new FakeUsers();

  reset(): void {
    this.requests = [];
    this.accounts = [];
    this.events = [];
    this.places = [];
    this.creations = new FakeCreations();
    this.statuses = [];
    this.users.reset();
  }

  hasCollectionStatuses(...statuses: CollectionStatus[]): void {
    this.statuses.push(...statuses);
  }

  storedEvents(): GlobalEvent[] {
    return this.events;
  }

  hasGlobalEvents(...events: Partial<GlobalEvent>[]): GlobalEvent[] {
    const stored = events.map((each) => newEvent(each));
    this.events.push(...stored);
    return stored;
  }

  hasPlaces(...places: (Omit<Place, 'id' | 'origin' | 'outlines'> & Partial<Place>)[]): Place[] {
    const stored = places.map((place): Place =>
      Object.assign({ id: crypto.randomUUID(), origin: 'campus_map', outlines: [] }, place),
    );
    this.places.push(...stored);
    return stored;
  }

  storedEvent(id: string): GlobalEvent | undefined {
    return this.events.find((each) => each.id === id);
  }

  hasAdministrators(...emails: string[]): void {
    for (const email of emails) {
      this.add(email);
    }
  }

  // Shaped like Google's: header, claims and signature.
  idTokenOf(email: string): string {
    return `e30.${Buffer.from(JSON.stringify({ email })).toString('base64url')}.signature`;
  }

  signedInAs(email: string): string {
    const account = this.accounts.find((each) => each.email === email);
    if (account === undefined) {
      throw new Error(`${email} is not registered`);
    }
    this.issued += 1;
    const token = `access-token-${this.issued}`;
    account.signedIn = true;
    account.tokens.add(token);
    return token;
  }

  signIn(idToken: string): Promise<{ accessToken: string }> {
    this.requests.push('POST /admin/auth/google');
    return new Promise((resolve) => {
      const email = this.accounts.map((each) => each.email).find((each) => this.idTokenOf(each) === idToken);
      if (!idToken.startsWith('e30.')) {
        throw new MainServerError(401);
      }
      if (email === undefined) {
        throw new MainServerError(403);
      }
      resolve({ accessToken: this.signedInAs(email) });
    });
  }

  signOut(token: string): Promise<void> {
    this.requests.push('POST /admin/auth/sign-out');
    return this.as(token, (account) => {
      account.tokens.clear();
    });
  }

  listAdministrators(token: string): Promise<Administrator[]> {
    this.requests.push('GET /admin/administrators');
    return this.as(token, () => this.accounts.map(toAdministrator).toSorted((a, b) => a.email.localeCompare(b.email)));
  }

  registerAdministrator(token: string, email: string): Promise<Administrator> {
    this.requests.push('POST /admin/administrators');
    return this.as(token, () => {
      const address = email.toLowerCase();
      return toAdministrator(this.accounts.find((each) => each.email === address) ?? this.add(address));
    });
  }

  removeAdministrator(token: string, id: string): Promise<void> {
    this.requests.push(`DELETE /admin/administrators/${id}`);
    return this.as(token, () => {
      if (!this.accounts.some((each) => each.id === id)) {
        throw new MainServerError(404);
      }
      if (this.accounts.length === 1) {
        throw new MainServerError(409);
      }
      this.accounts = this.accounts.filter((each) => each.id !== id);
    });
  }

  listGlobalEvents(token: string, state: 'draft' | 'published'): Promise<ListedGlobalEvent[]> {
    this.requests.push(`GET /admin/global-events?state=${state}`);
    return this.as(token, () =>
      this.events
        .filter((each) => each.state === state)
        .toSorted(byStart)
        .map(({ description: _description, ...listed }) => listed),
    );
  }

  createGlobalEvent(token: string, idempotencyKey: string, change: GlobalEventChange): Promise<GlobalEvent> {
    this.requests.push('POST /admin/global-events');
    return this.as(token, () =>
      this.creations.create(idempotencyKey, change, (event) => {
        this.events.push(event);
      }),
    );
  }

  listCollectionStatuses(token: string): Promise<CollectionStatus[]> {
    this.requests.push('GET /admin/collection-statuses');
    return this.as(token, () => this.statuses);
  }

  listUsers = (token: string): Promise<AdminUser[]> => this.answer('GET /admin/users', token, () => this.users.list());
  listFriendsOf = (token: string, id: string): Promise<AdminFriend[]> =>
    this.answer(`GET /admin/users/${id}/friends`, token, () => this.users.friendsOf(id));
  befriend = (token: string, a: string, b: string): Promise<void> =>
    this.answer('POST /admin/friendships', token, () => {
      this.users.befriend(a, b);
    });
  endFriendship = (token: string, a: string, b: string): Promise<void> =>
    this.answer(`DELETE /admin/friendships/${a}/${b}`, token, () => {
      this.users.end(a, b);
    });

  readGlobalEvent(token: string, id: string): Promise<GlobalEvent> {
    this.requests.push(`GET /admin/global-events/${id}`);
    return this.as(token, () => this.found(id));
  }

  editGlobalEvent(token: string, id: string, version: number, change: GlobalEventChange): Promise<GlobalEvent> {
    this.requests.push(`PATCH /admin/global-events/${id}`);
    return this.as(token, () => {
      const event = this.found(id);
      refuseFields(change);
      if (event.state !== 'draft' && event.state !== 'published') {
        throw refused(409, { code: 'GLOBAL_EVENT_STATE', state: event.state });
      }
      this.refuseOlder(event, version);
      const edited = withMissing({ ...event, ...change, title: change.title.trim() });
      if (event.state === 'published') {
        this.refuseIncomplete(edited);
      }
      return this.replace(edited);
    });
  }

  changeGlobalEventState(
    token: string,
    id: string,
    change: 'publish' | 'discard' | 'cancel',
    version: number,
  ): Promise<GlobalEvent> {
    this.requests.push(`POST /admin/global-events/${id}/${change}`);
    return this.as(token, () => {
      const event = this.found(id);
      const [from, to] = TRANSITIONS[change];
      if (event.state !== from) {
        throw refused(409, { code: 'GLOBAL_EVENT_STATE', state: event.state });
      }
      this.refuseOlder(event, version);
      if (change === 'publish') {
        this.refuseIncomplete(event);
      }
      return this.replace(withMissing({ ...event, state: to }));
    });
  }

  listPlaces(token: string): Promise<Place[]> {
    this.requests.push('GET /admin/places');
    return this.as(token, () => this.places);
  }

  private found(id: string): GlobalEvent {
    const event = this.storedEvent(id);
    if (event === undefined) {
      throw refused(404, { code: 'GLOBAL_EVENT_NOT_FOUND' });
    }
    return event;
  }

  private refuseOlder(event: GlobalEvent, version: number): void {
    if (event.version !== version) {
      throw refused(409, { code: 'GLOBAL_EVENT_CHANGED', version: event.version });
    }
  }

  private refuseIncomplete(event: GlobalEvent): void {
    const missing = missingFor(event);
    if (missing.length > 0) {
      throw refused(409, { code: 'GLOBAL_EVENT_INCOMPLETE', missing });
    }
  }

  private replace(event: GlobalEvent): GlobalEvent {
    const changed = { ...event, version: event.version + 1 };
    this.events = this.events.map((each) => (each.id === event.id ? changed : each));
    return changed;
  }

  private add(email: string): Account {
    const account = { id: crypto.randomUUID(), email, signedIn: false, tokens: new Set<string>() };
    this.accounts.push(account);
    return account;
  }

  private answer<T>(request: string, token: string, answer: () => T): Promise<T> {
    this.requests.push(request);
    return this.as(token, answer);
  }

  private as<T>(token: string, answer: (account: Account) => T): Promise<T> {
    return new Promise((resolve) => {
      const account = this.accounts.find((each) => each.tokens.has(token));
      if (account === undefined) {
        throw new MainServerError(401);
      }
      resolve(answer(account));
    });
  }
}

function toAdministrator({ id, email, signedIn }: Account): Administrator {
  return { id, email, signedIn };
}

export const fakeMainServer = new FakeMainServer();
