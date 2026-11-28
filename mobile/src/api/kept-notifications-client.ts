/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { KeptNotification } from './waiting-types';

// The Leader's `join-asked` is the push's copy of the row 알림 composes from the requests waiting, and `party-activated`
// the copy of a running Party's row. 알림 shows neither, so that nothing shows or counts twice, and 모두 지우기 keeps both.
export function isWaitingCopy({ kind }: Pick<KeptNotification, 'kind'>): boolean {
  return kind === 'join-asked' || kind === 'party-activated';
}

// What the screens ask of the main server about the Notifications it keeps for the User.
export interface KeptNotificationsClient {
  // The latest first.
  listNotifications: () => Promise<KeptNotification[]>;
  // Marks read the User's kept Notifications whose time has come.
  markNotificationsRead: () => Promise<void>;
  // Deletes one of the User's by its `id` in the list. One that is gone deletes nothing.
  deleteNotification: (id: string) => Promise<void>;
  // Deletes the User's whose time has come, as 모두 지우기 does, but the pushes' copies of what waits.
  deleteNotifications: () => Promise<void>;
}

// The operations of the client `chosen` gives at each call.
export function keptNotificationsOf(chosen: () => KeptNotificationsClient): KeptNotificationsClient {
  return {
    listNotifications: () => chosen().listNotifications(),
    markNotificationsRead: () => chosen().markNotificationsRead(),
    deleteNotification: (id) => chosen().deleteNotification(id),
    deleteNotifications: () => chosen().deleteNotifications(),
  };
}
