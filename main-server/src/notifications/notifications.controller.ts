/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
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

  // `id` is the list's identity, URL-encoded. One that is not the User's, or is gone, deletes nothing.
  @Delete('notifications/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: SignedInUser, @Param('id') id: string): Promise<void> {
    return this.notifications.delete(user.id, id);
  }
}
