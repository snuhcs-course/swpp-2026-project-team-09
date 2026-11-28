/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type INestApplication } from '@nestjs/common';
import { type NotificationDto } from '../src/notifications/dto/notification.dto.js';

// Far after every time a test keeps a Notification for.
const LATER = new Date('2200-01-01T00:00:00Z');

// Every Notification kept for the User, those whose time is still to come included, worded as `GET /notifications`
// gives them once their time has come. The route leaves one ahead out until it rings (P06 ticket 39); a test of what is
// kept for later reads it here.
export async function keptNotifications(app: INestApplication, userId: string): Promise<NotificationDto[]> {
  // Imported here, so that it is the one the started app registers.
  const { NotificationsService } = await import('../src/notifications/notifications.service.js');
  return app.get(NotificationsService).listFor(userId, LATER);
}
