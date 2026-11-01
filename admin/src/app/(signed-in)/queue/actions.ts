/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

'use server';

import { refresh } from 'next/cache';

import { mainServer, MainServerError } from '@/main-server';
import { asAdministrator } from '@/session';

import { listed, NEEDED } from '../events/fields';

export type QueueAction = { sessionId: string; version: number } & (
  { kind: 'attach'; globalEventId: string } | { kind: 'publish' }
);

const REFUSALS: Record<string, string> = {
  GLOBAL_EVENT_CHANGED: 'Another Administrator changed this Draft after you opened the page. Look at it again.',
  CANDIDATE_GONE: 'That event is no longer a candidate of this session.',
};

function refusedFor({ refusal }: MainServerError): string | null {
  if (refusal.code === 'GLOBAL_EVENT_INCOMPLETE') {
    return `This Draft needs ${listed((refusal.missing ?? []).map((each) => NEEDED[each]))} to be published. Fill them in on its page, and publish it again.`;
  }
  return REFUSALS[refusal.code ?? ''] ?? null;
}

function send(token: string, action: QueueAction): Promise<void> {
  const { sessionId, version } = action;
  return action.kind === 'attach'
    ? mainServer.attachQueuedSession(token, sessionId, version, action.globalEventId)
    : mainServer.publishQueuedSession(token, sessionId, version);
}

// What the queue says after a refusal, the page reloaded.
export async function decideSession(action: QueueAction): Promise<string | null> {
  try {
    await asAdministrator('/queue', (token) => send(token, action));
  } catch (error) {
    // Another Administrator decided it: the reload takes its card away, and that says so.
    if (error instanceof MainServerError && error.refusal.code === 'POST_SESSION_NOT_QUEUED') {
      refresh();
      return null;
    }
    const refused = error instanceof MainServerError ? refusedFor(error) : null;
    if (refused === null) {
      throw error;
    }
    refresh();
    return refused;
  }
  refresh();
  return null;
}
