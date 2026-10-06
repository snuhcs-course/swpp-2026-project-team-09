import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { MainServerError } from '@/main-server';

export const SESSION_COOKIE = '__Host-access-token';
// The signed-in Administrator's address, only for the menu: the main server's token does not carry it.
export const EMAIL_COOKIE = '__Host-administrator-email';

// No Expires or Max-Age: the cookies end with the browser, and the main server ends the token after 8 hours.
const ATTRIBUTES = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' } as const;

function signInPath(path: string): string {
  return `/sign-in?next=${encodeURIComponent(path)}`;
}

// Calls the main server with the cookie's token. Without a cookie, or on a 401, the person signs in and comes back to
// the page at `path`.
export async function asAdministrator<T>(path: string, call: (token: string) => Promise<T>): Promise<T> {
  const token = await sessionToken();
  if (token === undefined) {
    redirect(signInPath(path));
  }
  try {
    return await call(token);
  } catch (error) {
    if (error instanceof MainServerError && error.status === 401) {
      redirect(signInPath(path));
    }
    throw error;
  }
}

export async function startSession(token: string, email: string | undefined): Promise<void> {
  const store = await cookies();
  store.set({ name: SESSION_COOKIE, value: token, ...ATTRIBUTES });
  if (email === undefined) {
    store.delete({ name: EMAIL_COOKIE, ...ATTRIBUTES });
  } else {
    store.set({ name: EMAIL_COOKIE, value: email, ...ATTRIBUTES });
  }
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function signedInEmail(): Promise<string | undefined> {
  return (await cookies()).get(EMAIL_COOKIE)?.value;
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete({ name: SESSION_COOKIE, ...ATTRIBUTES });
  store.delete({ name: EMAIL_COOKIE, ...ATTRIBUTES });
}
