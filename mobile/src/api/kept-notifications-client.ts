/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { KeptNotification } from './waiting-types';

// What the screens ask of the main server about the Notifications it keeps for the User.
export interface KeptNotificationsClient {
  // The latest first.
  listNotifications: () => Promise<KeptNotification[]>;
  // Marks read the User's kept Notifications whose time has come.
  markNotificationsRead: () => Promise<void>;
}

// The operations of the client `chosen` gives at each call.
export function keptNotificationsOf(chosen: () => KeptNotificationsClient): KeptNotificationsClient {
  return {
    listNotifications: () => chosen().listNotifications(),
    markNotificationsRead: () => chosen().markNotificationsRead(),
  };
}
