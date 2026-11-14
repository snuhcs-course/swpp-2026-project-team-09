/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LateSignal } from '@/api/late-types';
import { fieldOf, listenersOf, text } from './listeners';

// The other Holders' apps hear at once that a Holder is late (`socket-server/README.md`, "Signals"), so that a screen
// can show the minutes and the arrival before the Quests are fetched again.

const listeners = listenersOf<LateSignal>();

// Gives the way to stop listening.
export const onLateReport = listeners.add;

// A signal as it arrived. Any other signal, or a payload missing a field or with one of another type, tells nobody.
export function tellLateReport(name: string, payload: unknown): void {
  const questId = text(payload, 'questId');
  const userId = text(payload, 'userId');
  const minutes = fieldOf(payload, 'minutes');
  const arriveAt = fieldOf(payload, 'arriveAt');
  if (
    name !== 'late' ||
    questId === undefined ||
    userId === undefined ||
    typeof minutes !== 'number' ||
    (arriveAt !== null && typeof arriveAt !== 'string')
  ) {
    return;
  }
  listeners.tell({ questId, userId, minutes, arriveAt });
}
