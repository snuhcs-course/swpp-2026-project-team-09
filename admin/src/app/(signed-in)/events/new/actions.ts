// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
'use server';

import { redirect } from 'next/navigation';

import { type GlobalEventChange, mainServer, MainServerError } from '@/main-server';
import { asAdministrator } from '@/session';

function refusalOf(error: unknown): string | null {
  if (error instanceof MainServerError && error.status === 400) {
    const { message } = error.refusal;
    return `The main server did not accept the event: ${(Array.isArray(message) ? message.join(' ') : message) ?? 'no reason given'}`;
  }
  if (error instanceof MainServerError && error.refusal.code === 'IDEMPOTENCY_KEY_IN_USE') {
    return 'The first attempt is still being handled. Wait a moment and try again.';
  }
  // A fetch that failed, or a 5xx: the event may have been created with the answer lost on the way.
  if ((error instanceof MainServerError && error.status >= 500) || error instanceof TypeError) {
    return 'The main server did not answer. Press Create the Draft to try again: an unchanged form does not create the event twice.';
  }
  return null;
}

// `idempotencyKey` is made when the person confirms the form, and sent again on a retry of the same form.
export async function createEvent(idempotencyKey: string, change: GlobalEventChange): Promise<string> {
  let id: string;
  try {
    ({ id } = await asAdministrator('/events/new', (token) =>
      mainServer.createGlobalEvent(token, idempotencyKey, change),
    ));
  } catch (error) {
    const refused = refusalOf(error);
    if (refused === null) {
      throw error;
    }
    return refused;
  }
  return redirect(`/events/${id}`);
}
