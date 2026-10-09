/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';

import { GoogleSignIn } from './google-sign-in';

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>): Promise<ReactElement> {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm space-y-6 p-8 text-center">
        <div className="space-y-1">
          <h1>
            SNU Now <span className="text-accent">Admin</span>
          </h1>
          <p className="text-sm text-zinc-600">Sign in with the Google account registered as an Administrator.</p>
        </div>
        <GoogleSignIn next={typeof next === 'string' ? next : '/'} />
      </div>
    </main>
  );
}
