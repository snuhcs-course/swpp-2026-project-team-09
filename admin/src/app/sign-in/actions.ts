/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

'use server';

import { redirect } from 'next/navigation';

import { mainServer, MainServerError } from '@/main-server';
import { startSession } from '@/session';

// Only a path of this site is followed after signing in; anything else leads to the home page.
function sitePath(next: FormDataEntryValue | null): string {
  if (typeof next !== 'string' || !next.startsWith('/')) {
    return '/';
  }
  const base = 'http://admin.invalid';
  const url = new URL(next, base);
  return url.origin === base ? `${url.pathname}${url.search}` : '/';
}

// The address in a Google ID token the main server has just accepted, read without checking it again, only to show it.
function emailIn(idToken: string): string | undefined {
  try {
    const claims: unknown = JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString());
    if (typeof claims === 'object' && claims !== null && 'email' in claims && typeof claims.email === 'string') {
      return claims.email;
    }
  } catch {
    // Not a JWT; the menu then shows no address.
  }
  return undefined;
}

export async function signIn(_message: string | null, form: FormData): Promise<string> {
  const credential = form.get('credential');
  const idToken = typeof credential === 'string' ? credential : '';
  let accessToken: string;
  try {
    ({ accessToken } = await mainServer.signIn(idToken));
  } catch (error) {
    if (error instanceof MainServerError && error.status === 403) {
      return 'This Google account is not a registered Administrator.';
    }
    if (error instanceof MainServerError && error.status === 401) {
      return 'Signing in failed. Try again.';
    }
    throw error;
  }
  await startSession(accessToken, emailIn(idToken));
  return redirect(sitePath(form.get('next')));
}
