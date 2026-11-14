/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { FriendLevel, User } from '../../generated/prisma/client.js';

// Read in capitals, so that a Friend ID typed in small letters is found too. Any other text is a Friend ID nobody holds.
export const friendIdSchema = z.string().trim().toUpperCase().min(1);

export const sendFriendRequestSchema = z.object({ friendId: friendIdSchema });

export type SendFriendRequestDto = z.infer<typeof sendFriendRequestSchema>;

export interface UserSummaryDto {
  name: string;
  department: string;
}

export function toUserSummaryDto({ name, department }: Pick<User, 'name' | 'department'>): UserSummaryDto {
  return { name, department };
}

// Whether the request waits for the other User, or made the two Friends because the other had already asked.
export interface SentFriendRequestDto {
  status: 'waiting' | 'friends';
}

export interface FriendRequestsDto {
  received: { id: string; sender: UserSummaryDto; sentAt: string }[];
  sent: { id: string; receiver: UserSummaryDto; sentAt: string }[];
}

// id is the Friend's User id, which ending the friendship names. level is the User's own end of the friendship, and
// sharing whether it is above the Timetable, for an app of before. visible is whether the User sees the Friend's
// position or Place now, never why not.
export interface FriendDto extends UserSummaryDto {
  id: string;
  level: FriendLevel;
  sharing: boolean;
  visible: boolean;
}

export function toFriendDto(
  user: Pick<User, 'id' | 'name' | 'department'>,
  level: FriendLevel,
  visible: boolean,
): FriendDto {
  return { id: user.id, ...toUserSummaryDto(user), level, sharing: level !== FriendLevel.timetable, visible };
}

export const friendLevelSchema = z.strictObject({ level: z.enum(FriendLevel) });

export type FriendLevelDto = z.infer<typeof friendLevelSchema>;

// The order of a User's Friends, as `GET /friends` lists them: by name in the Korean order.
export function byName(a: Pick<User, 'id' | 'name'>, b: Pick<User, 'id' | 'name'>): number {
  return a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id);
}

// A User as an Administrator lists them. A User before onboarding has an empty name and department.
export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  department: string;
  friendId: string;
  onboarded: boolean;
  friendCount: number;
}

// A Friend of a User as an Administrator reads them, with when the friendship started.
export interface AdminFriendDto {
  id: string;
  name: string;
  email: string;
  department: string;
  friendId: string;
  since: string;
}

export const makeFriendshipSchema = z.strictObject({ userAId: z.uuid(), userBId: z.uuid() });

export type MakeFriendshipDto = z.infer<typeof makeFriendshipSchema>;
