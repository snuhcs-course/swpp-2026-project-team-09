// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { AdministratorOnly } from '../common/administrator-only.decorator.js';
import { AdminFriendDto, AdminUserDto, type MakeFriendshipDto, makeFriendshipSchema } from './dto/friends.dto.js';
import { AdminFriendsService } from './admin-friends.service.js';
import { FriendsService } from './friends.service.js';

// For setting up demo accounts. Nothing else about a User is read or changed here.
@AdministratorOnly()
@Controller('admin')
export class AdminFriendsController {
  constructor(
    private readonly adminFriends: AdminFriendsService,
    private readonly friends: FriendsService,
  ) {}

  @Get('users')
  listUsers(): Promise<AdminUserDto[]> {
    return this.adminFriends.listUsers();
  }

  @Get('users/:id/friends')
  listFriends(@Param('id', { schema: z.uuid() }) id: string): Promise<AdminFriendDto[]> {
    return this.adminFriends.listFriends(id);
  }

  // A repeat is refused as already Friends, so it takes no Idempotency-Key.
  @Post('friendships')
  @HttpCode(HttpStatus.NO_CONTENT)
  befriend(@Body({ schema: makeFriendshipSchema }) { userAId, userBId }: MakeFriendshipDto): Promise<void> {
    return this.adminFriends.befriend(userAId, userBId);
  }

  // As either User's ending of it.
  @Delete('friendships/:userAId/:userBId')
  @HttpCode(HttpStatus.NO_CONTENT)
  end(
    @Param('userAId', { schema: z.uuid() }) userAId: string,
    @Param('userBId', { schema: z.uuid() }) userBId: string,
  ): Promise<void> {
    return this.friends.end(userAId, userBId);
  }
}
