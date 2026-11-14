/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type NotificationKind } from '../notification.js';

// `id` is the Notification's identity, `at` its time in Korea with the offset, and `url` the address it opens.
export interface NotificationDto {
  id: string;
  kind: NotificationKind;
  title: string;
  line: string;
  at: string;
  url: string;
}
