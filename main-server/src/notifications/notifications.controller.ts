/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type NotificationDto } from './dto/notification.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  list(@CurrentUser() user: SignedInUser): Promise<NotificationDto[]> {
    return this.notifications.listFor(user.id);
  }

  // When 알림 has shown its rows: the User's Notifications whose time has come are read.
  @Post('notifications/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@CurrentUser() user: SignedInUser): Promise<void> {
    return this.notifications.markRead(user.id);
  }
}
