/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Friendship, FriendLevel, User } from '../../generated/prisma/client.js';
import { type FriendLabel } from '../friend-label.js';

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

// The User's own end of a friendship: what the User lets the Friend see, and when the app asked the User about them.
export interface FriendEnd {
  level: FriendLevel;
  offAskedAt: Date | null;
  planAskedAt: Date | null;
}

export function endOf(row: Friendship, userId: string): FriendEnd {
  return row.userAId === userId
    ? { level: row.userALevel, offAskedAt: row.userAOffAskedAt, planAskedAt: row.userAPlanAskedAt }
    : { level: row.userBLevel, offAskedAt: row.userBOffAskedAt, planAskedAt: row.userBPlanAskedAt };
}

// id is the Friend's User id, which ending the friendship names. level is the User's own end of the friendship, and
// sharing whether it is above the Timetable, for an app of before. seen is what the two see of each other by the
// friendship, the same from both sides, and the only word on the Friend's own end. visible is whether the User sees the
// Friend's position or Place now, never why not. askedOff and askedPlan say whether the app has asked the User about
// the Friend before turning location off for them, and after a Plan with them became a Quest. label is how the Friend
// reads among all of the User's Friends.
export interface FriendDto extends UserSummaryDto {
  id: string;
  label: FriendLabel;
  level: FriendLevel;
  seen: FriendLevel;
  sharing: boolean;
  visible: boolean;
  askedOff: boolean;
  askedPlan: boolean;
}

export function toFriendDto(
  user: Pick<User, 'id' | 'name' | 'department'>,
  { level, offAskedAt, planAskedAt }: FriendEnd,
  { seen, visible, label }: { seen: FriendLevel; visible: boolean; label: FriendLabel },
): FriendDto {
  return {
    id: user.id,
    ...toUserSummaryDto(user),
    label,
    level,
    seen,
    sharing: level !== FriendLevel.timetable,
    visible,
    askedOff: offAskedAt !== null,
    askedPlan: planAskedAt !== null,
  };
}

export const friendLevelSchema = z.strictObject({ level: z.enum(FriendLevel) });

export type FriendLevelDto = z.infer<typeof friendLevelSchema>;

// As many as a Plan has people.
const ASKED_MAX = 8;

// The Friends the app asked the User about at one of its two moments.
export const askedSchema = z.strictObject({
  userIds: z.array(z.uuid()).min(1).max(ASKED_MAX),
  moment: z.enum(['off', 'plan']),
});

export type AskedDto = z.infer<typeof askedSchema>;

// A Friend of a Plan made into a Quest whom the User was not asked about yet, with the User's end.
export interface AskLevelDto {
  userId: string;
  name: string;
  level: FriendLevel;
}

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
