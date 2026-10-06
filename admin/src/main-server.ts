import 'server-only';

export type GlobalEventState = 'draft' | 'published' | 'cancelled' | 'discarded';

// What publishing a Draft still needs.
export type Missing = 'startsAt' | 'position';

// The body of an answer that is not 2xx. `message` is a list for a 400.
export interface Refusal {
  code?: string;
  message?: string | string[];
  state?: GlobalEventState;
  version?: number;
  missing?: Missing[];
}

export class MainServerError extends Error {
  constructor(
    readonly status: number,
    readonly refusal: Refusal = {},
  ) {
    super(`The main server answered ${status}.`);
  }
}

export interface Administrator {
  id: string;
  email: string;
  signedIn: boolean;
}

export interface ListedGlobalEvent {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  place: string | null;
  latitude: number | null;
  longitude: number | null;
  state: GlobalEventState;
  version: number;
  postNumber: number | null;
  sourceUrl: string | null;
  missing: Missing[];
}

export interface GlobalEvent extends ListedGlobalEvent {
  description: string;
}

// The fields an edit sends. Times carry their offset; null clears an optional field.
export interface GlobalEventChange {
  title: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  place: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Place {
  id: string;
  number: string | null;
  name: string;
  latitude: number;
  longitude: number;
}

async function refusalOf(response: Response): Promise<Refusal> {
  try {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the main server answers in the documented shape
    return (await response.json()) as Refusal;
  } catch {
    return {};
  }
}

async function request<T>(method: string, path: string, token?: string, body?: unknown): Promise<T> {
  const address = process.env.MAIN_SERVER_URL;
  if (address === undefined || address === '') {
    throw new Error('MAIN_SERVER_URL is not set.');
  }
  const headers = new Headers();
  if (token !== undefined) {
    headers.set('authorization', `Bearer ${token}`);
  }
  if (body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  const response = await fetch(new URL(path, address), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new MainServerError(response.status, await refusalOf(response));
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the main server answers in the documented shape
  return (response.status === 204 ? undefined : await response.json()) as T;
}

const eventPath = (id: string): string => `/admin/global-events/${encodeURIComponent(id)}`;

// Every call the site makes to the main server goes through here. Page tests replace it with a fake.
export const mainServer = {
  signIn: (idToken: string): Promise<{ accessToken: string }> =>
    request('POST', '/admin/auth/google', undefined, { idToken }),
  signOut: (token: string): Promise<void> => request('POST', '/admin/auth/sign-out', token),
  listAdministrators: (token: string): Promise<Administrator[]> => request('GET', '/admin/administrators', token),
  registerAdministrator: (token: string, email: string): Promise<Administrator> =>
    request('POST', '/admin/administrators', token, { email }),
  removeAdministrator: (token: string, id: string): Promise<void> =>
    request('DELETE', `/admin/administrators/${encodeURIComponent(id)}`, token),
  listGlobalEvents: (token: string, state: 'draft' | 'published'): Promise<ListedGlobalEvent[]> =>
    request('GET', `/admin/global-events?state=${state}`, token),
  readGlobalEvent: (token: string, id: string): Promise<GlobalEvent> => request('GET', eventPath(id), token),
  editGlobalEvent: (token: string, id: string, version: number, change: GlobalEventChange): Promise<GlobalEvent> =>
    request('PATCH', eventPath(id), token, { version, ...change }),
  changeGlobalEventState: (
    token: string,
    id: string,
    change: 'publish' | 'discard' | 'cancel',
    version: number,
  ): Promise<GlobalEvent> => request('POST', `${eventPath(id)}/${change}`, token, { version }),
  listPlaces: (token: string): Promise<Place[]> => request('GET', '/admin/places', token),
};

export type MainServer = typeof mainServer;
