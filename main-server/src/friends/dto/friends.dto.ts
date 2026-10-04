import { z } from 'zod';
import { User } from '../../generated/prisma/client.js';

// Read in capitals, so that a Friend ID typed in small letters is found too. Any other text is a Friend ID nobody holds.
export const friendIdSchema = z.string().trim().toUpperCase().min(1);

export const sendFriendRequestSchema = z.object({ friendId: friendIdSchema });

export type SendFriendRequestDto = z.infer<typeof sendFriendRequestSchema>;

// What a User sees of someone who is not yet their Friend.
export interface PersonDto {
  name: string;
  department: string;
}

export function toPersonDto({ name, department }: Pick<User, 'name' | 'department'>): PersonDto {
  return { name, department };
}

// Whether the request waits for the other User, or made the two Friends because the other had already asked.
export interface SentFriendRequestDto {
  status: 'waiting' | 'friends';
}

// sentAt is ISO 8601. The newest first in each list.
export interface FriendRequestsDto {
  received: { id: string; sender: PersonDto; sentAt: string }[];
  sent: { id: string; receiver: PersonDto; sentAt: string }[];
}

// id is the Friend's User id, which ending the friendship names.
export interface FriendDto extends PersonDto {
  id: string;
}
