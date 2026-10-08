'use server';

import { refresh } from 'next/cache';

import { type GlobalEventChange, type GlobalEventState, mainServer, MainServerError } from '@/main-server';
import { asAdministrator } from '@/session';

import { listed, NEEDED } from '../fields';

// What the page says after a refused change. `reload` offers to load the current version, keeping the input until then.
export interface Refused {
  message: string;
  reload: boolean;
}

const STATES: Record<GlobalEventState, string> = {
  draft: 'a Draft',
  published: 'published',
  cancelled: 'cancelled',
  discarded: 'discarded',
};

function refusedFor({ status, refusal }: MainServerError, kind: EventChange['kind']): Refused | null {
  if (status === 400) {
    const message = Array.isArray(refusal.message) ? refusal.message.join(' ') : refusal.message;
    return { message: `The main server did not accept the change: ${message ?? 'no reason given'}`, reload: false };
  }
  if (refusal.code === 'GLOBAL_EVENT_INCOMPLETE') {
    const needed = listed((refusal.missing ?? []).map((each) => NEEDED[each]));
    const message =
      kind === 'publish' ? `This event needs ${needed} to be published.` : `A published event needs ${needed}.`;
    return { message, reload: false };
  }
  if (refusal.code === 'GLOBAL_EVENT_STATE' && refusal.state !== undefined) {
    return { message: `This event is ${STATES[refusal.state]} now, so this change cannot be made.`, reload: true };
  }
  if (refusal.code === 'GLOBAL_EVENT_CHANGED') {
    return {
      message:
        'Another Administrator changed this event after you opened it. What you typed is kept here; loading the current version replaces it with theirs.',
      reload: true,
    };
  }
  return null;
}

export type EventChange = { id: string; version: number } & (
  | { kind: 'save'; change: GlobalEventChange }
  | { kind: 'publish'; change: GlobalEventChange }
  | { kind: 'discard' }
  | { kind: 'cancel' }
);

async function send(token: string, request: EventChange): Promise<unknown> {
  const { id, version } = request;
  if (request.kind === 'discard' || request.kind === 'cancel') {
    return mainServer.changeGlobalEventState(token, id, request.kind, version);
  }
  if (request.kind !== 'save' && request.kind !== 'publish') {
    throw new Error('No such change of a Global Event.');
  }
  const saved = await mainServer.editGlobalEvent(token, id, version, request.change);
  return request.kind === 'publish' ? mainServer.changeGlobalEventState(token, id, 'publish', saved.version) : saved;
}

// Publishing saves the form first. After a refusal the page keeps what the person typed. When publishing is refused
// after its save went through, another Administrator changed the event in between, so the refusal offers the reload.
export async function changeEvent(request: EventChange): Promise<Refused | null> {
  try {
    await asAdministrator(`/events/${request.id}`, (token) => send(token, request));
  } catch (error) {
    const refused = error instanceof MainServerError ? refusedFor(error, request.kind) : null;
    if (refused === null) {
      throw error;
    }
    return refused;
  }
  refresh();
  return null;
}

// oxlint-disable-next-line require-await -- a Server Action is an async function, also one that awaits nothing
export async function loadCurrentVersion(): Promise<void> {
  refresh();
}
