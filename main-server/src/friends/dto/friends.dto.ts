import { z } from 'zod';
import { User } from '../../generated/prisma/client.js';

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

// id is the Friend's User id, which ending the friendship names. sharing is the User's own switch for the friendship,
// and visible whether the User can see the Friend now, never why not.
export interface FriendDto extends UserSummaryDto {
  id: string;
  sharing: boolean;
  visible: boolean;
}

export function toFriendDto(
  user: Pick<User, 'id' | 'name' | 'department'>,
  sharing: boolean,
  visible: boolean,
): FriendDto {
  return { id: user.id, ...toUserSummaryDto(user), sharing, visible };
}
