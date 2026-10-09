// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
'use server';

import { redirect } from 'next/navigation';

import { mainServer, MainServerError } from '@/main-server';
import { endSession, sessionToken } from '@/session';

export async function signOut(): Promise<void> {
  const token = await sessionToken();
  if (token !== undefined) {
    try {
      await mainServer.signOut(token);
    } catch (error) {
      // 401: the token had already ended, so there is nothing left to end on the main server.
      if (!(error instanceof MainServerError && error.status === 401)) {
        throw error;
      }
    }
  }
  await endSession();
  redirect('/sign-in');
}
