/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type NotificationKind } from '../notification.js';

// `id` is the Notification's identity, `at` its time in Korea with the offset, `ahead` the title while `at` is still to
// come, `url` the address it opens, and `read` whether the User has read it in 알림.
export interface NotificationDto {
  id: string;
  kind: NotificationKind;
  title: string;
  ahead: string | null;
  line: string;
  at: string;
  url: string;
  read: boolean;
}
