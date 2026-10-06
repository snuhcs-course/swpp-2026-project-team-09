import 'server-only';

export class MainServerError extends Error {
  constructor(readonly status: number) {
    super(`The main server answered ${status}.`);
  }
}

export interface Administrator {
  id: string;
  email: string;
  signedIn: boolean;
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
    throw new MainServerError(response.status);
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the main server answers in the documented shape
  return (response.status === 204 ? undefined : await response.json()) as T;
}

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
};

export type MainServer = typeof mainServer;
