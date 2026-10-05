import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type SwitchDto, switchSchema } from '../location-sharing/dto/switch.dto.js';
import {
  FriendDto,
  friendIdSchema,
  FriendRequestsDto,
  type SendFriendRequestDto,
  sendFriendRequestSchema,
  SentFriendRequestDto,
  toUserSummaryDto,
  UserSummaryDto,
} from './dto/friends.dto.js';
import { FriendsService } from './friends.service.js';

@Controller()
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get('friend-ids/:friendId')
  async lookUp(@Param('friendId', { schema: friendIdSchema }) friendId: string): Promise<UserSummaryDto> {
    return toUserSummaryDto(await this.friends.ownerOf(friendId));
  }

  // A repeat is refused as a request already sent, so it takes no Idempotency-Key.
  @Post('friend-requests')
  sendRequest(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: sendFriendRequestSchema }) body: SendFriendRequestDto,
  ): Promise<SentFriendRequestDto> {
    return this.friends.sendRequest(user.id, body.friendId);
  }

  @Get('friend-requests')
  requests(@CurrentUser() user: SignedInUser): Promise<FriendRequestsDto> {
    return this.friends.listRequests(user.id);
  }

  @Post('friend-requests/:id/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  accept(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.friends.accept(user.id, id);
  }

  @Post('friend-requests/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  decline(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.friends.decline(user.id, id);
  }

  @Post('friend-requests/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.friends.cancel(user.id, id);
  }

  @Get('friends')
  list(@CurrentUser() user: SignedInUser): Promise<FriendDto[]> {
    return this.friends.listFriends(user.id);
  }

  @Delete('friends/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  end(@CurrentUser() user: SignedInUser, @Param('userId', { schema: z.uuid() }) userId: string): Promise<void> {
    return this.friends.end(user.id, userId);
  }

  @Put('friends/:userId/sharing')
  @HttpCode(HttpStatus.NO_CONTENT)
  setSharing(
    @CurrentUser() user: SignedInUser,
    @Param('userId', { schema: z.uuid() }) userId: string,
    @Body({ schema: switchSchema }) body: SwitchDto,
  ): Promise<void> {
    return this.friends.setSharing(user.id, userId, body.on);
  }
}
