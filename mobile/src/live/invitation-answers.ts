/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { listenersOf, text } from './listeners';

// The Leader's app hears at once that an invited User answered (`socket-server/README.md`, "Signals"), so that a
// screen can mark that User before the Quests are fetched again.

export interface InvitationAnswer {
  kind: 'accepted' | 'declined';
  questId: string;
  userId: string;
}

const KINDS = new Map<string, InvitationAnswer['kind']>([
  ['invitation-accepted', 'accepted'],
  ['invitation-declined', 'declined'],
]);

const listeners = listenersOf<InvitationAnswer>();

// Gives the way to stop listening.
export const onInvitationAnswer = listeners.add;

// A signal as it arrived. Any signal but the two answers, or a payload without both ids, tells nobody.
export function tellInvitationAnswer(name: string, payload: unknown): void {
  const kind = KINDS.get(name);
  const questId = text(payload, 'questId');
  const userId = text(payload, 'userId');
  if (kind === undefined || questId === undefined || userId === undefined) {
    return;
  }
  listeners.tell({ kind, questId, userId });
}
