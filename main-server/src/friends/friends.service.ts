import { BadRequestException, ConflictException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { MeetupState, Prisma, User } from '../generated/prisma/client.js';
import { VisibilityService } from '../location-sharing/visibility.service.js';
import { UsersService } from '../users/users.service.js';
import {
  FriendDto,
  FriendRequestsDto,
  SentFriendRequestDto,
  toFriendDto,
  toUserSummaryDto,
} from './dto/friends.dto.js';

interface Pair {
  userAId: string;
  userBId: string;
}

function pairOf(userId: string, otherUserId: string): Pair {
  return userId < otherUserId ? { userAId: userId, userBId: otherUserId } : { userAId: otherUserId, userBId: userId };
}

const USER_SUMMARY = { select: { id: true, name: true, department: true } } as const;

type UserSummary = Pick<User, 'id' | 'name' | 'department'>;

function otherOf(row: { userAId: string; userA: UserSummary; userB: UserSummary }, userId: string): UserSummary {
  return row.userAId === userId ? row.userB : row.userA;
}

function ofUser(userId: string): Prisma.FriendshipWhereInput {
  return { OR: [{ userAId: userId }, { userBId: userId }] };
}

function receivedBy(userId: string, requestId: string): Prisma.FriendshipWhereInput {
  return { id: requestId, senderId: { not: userId }, ...ofUser(userId) };
}

async function removeWaiting(tx: Prisma.TransactionClient, requestId: string): Promise<number> {
  const { count } = await tx.friendship.deleteMany({ where: { id: requestId, acceptedAt: null } });
  return count;
}

const friendIdNotFound = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'FRIEND_ID_NOT_FOUND',
    message: 'Nobody holds this Friend ID.',
  });

const friendRequestNotFound = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'FRIEND_REQUEST_NOT_FOUND',
    message: 'No such Friend Request waits for this answer from this User.',
  });

const alreadyFriends = (): ConflictException =>
  new ConflictException({
    statusCode: HttpStatus.CONFLICT,
    error: 'Conflict',
    code: 'ALREADY_FRIENDS',
    message: 'This User is already your Friend.',
  });

const friendNotFound = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'FRIEND_NOT_FOUND',
    message: 'This User is not your Friend.',
  });

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly signals: SignalsService,
    private readonly visibility: VisibilityService,
  ) {}

  async ownerOf(friendId: string): Promise<User> {
    const owner = await this.prisma.user.findUnique({ where: { friendId } });
    if (owner === null) {
      throw friendIdNotFound();
    }
    return owner;
  }

  async sendRequest(senderId: string, friendId: string): Promise<SentFriendRequestDto> {
    const receiver = await this.ownerOf(friendId);
    if (receiver.id === senderId) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        code: 'OWN_FRIEND_ID',
        message: 'This is your own Friend ID.',
      });
    }
    const pair = pairOf(senderId, receiver.id);
    return this.changeBetween(pair, async (tx) => {
      const existing = await tx.friendship.findUnique({ where: { userAId_userBId: pair } });
      if (existing === null) {
        await tx.friendship.create({ data: { ...pair, senderId } });
        return { status: 'waiting' };
      }
      if (existing.acceptedAt !== null) {
        throw alreadyFriends();
      }
      if (existing.senderId === senderId) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          code: 'FRIEND_REQUEST_ALREADY_SENT',
          message: 'Your Friend Request to this User is waiting.',
        });
      }
      // The other User's request waits, so the two have asked each other.
      await tx.friendship.update({ where: { id: existing.id }, data: { acceptedAt: new Date() } });
      return { status: 'friends' };
    });
  }

  // Makes two Users Friends at once, as accepting an Invite Link does: a Friend Request waiting between them becomes
  // the friendship. `alongside` runs in the same transaction once both are locked, so that what it changes is stored
  // only with the friendship, and a refusal it throws stores neither.
  async befriend(
    senderId: string,
    receiverId: string,
    alongside: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<void> {
    const pair = pairOf(senderId, receiverId);
    await this.changeBetween(pair, async (tx) => {
      const existing = await tx.friendship.findUnique({ where: { userAId_userBId: pair } });
      if (existing !== null && existing.acceptedAt !== null) {
        throw alreadyFriends();
      }
      await alongside(tx);
      const acceptedAt = new Date();
      if (existing === null) {
        await tx.friendship.create({ data: { ...pair, senderId, acceptedAt } });
      } else {
        await tx.friendship.update({ where: { id: existing.id }, data: { acceptedAt } });
      }
    });
  }

  async listRequests(userId: string): Promise<FriendRequestsDto> {
    const waiting = await this.prisma.friendship.findMany({
      where: { acceptedAt: null, ...ofUser(userId) },
      include: { userA: USER_SUMMARY, userB: USER_SUMMARY },
      orderBy: { sentAt: 'desc' },
    });
    const lists: FriendRequestsDto = { received: [], sent: [] };
    for (const row of waiting) {
      const other = toUserSummaryDto(otherOf(row, userId));
      const sentAt = row.sentAt.toISOString();
      if (row.senderId === userId) {
        lists.sent.push({ id: row.id, receiver: other, sentAt });
      } else {
        lists.received.push({ id: row.id, sender: other, sentAt });
      }
    }
    return lists;
  }

  accept(userId: string, requestId: string): Promise<void> {
    return this.answer(receivedBy(userId, requestId), async (tx) => {
      const { count } = await tx.friendship.updateMany({
        where: { id: requestId, acceptedAt: null },
        data: { acceptedAt: new Date() },
      });
      return count;
    });
  }

  decline(userId: string, requestId: string): Promise<void> {
    return this.answer(receivedBy(userId, requestId), (tx) => removeWaiting(tx, requestId));
  }

  cancel(userId: string, requestId: string): Promise<void> {
    return this.answer({ id: requestId, senderId: userId }, (tx) => removeWaiting(tx, requestId));
  }

  async listFriends(userId: string): Promise<FriendDto[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { acceptedAt: { not: null }, ...ofUser(userId) },
      include: { userA: USER_SUMMARY, userB: USER_SUMMARY },
    });
    const visible = new Set(await this.visibility.visibleTo(userId));
    return rows
      .map((row) => {
        const friend = otherOf(row, userId);
        const sharing = row.userAId === userId ? row.userASharing : row.userBSharing;
        return toFriendDto(friend, sharing, visible.has(friend.id));
      })
      .toSorted((a, b) => a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id));
  }

  // Withdraws the Meetups still proposed between the two. The Quests of accepted ones stay.
  async end(userId: string, friendUserId: string): Promise<void> {
    const pair = pairOf(userId, friendUserId);
    const withdrawn = await this.visibility.announceRemovals(userId, () =>
      this.changeBetween(pair, async (tx) => {
        const { count } = await tx.friendship.deleteMany({ where: { ...pair, acceptedAt: { not: null } } });
        if (count === 0) {
          throw friendNotFound();
        }
        const meetups = await tx.meetup.updateMany({
          where: {
            state: MeetupState.proposed,
            startsAt: { gt: new Date() },
            OR: [
              { proposerId: pair.userAId, receiverId: pair.userBId },
              { proposerId: pair.userBId, receiverId: pair.userAId },
            ],
          },
          data: { state: MeetupState.withdrawn },
        });
        return meetups.count;
      }),
    );
    if (withdrawn > 0) {
      this.signals.send([pair.userAId, pair.userBId], 'meetups-changed');
    }
  }

  // The User's switch for Location Sharing at their own end of the friendship.
  async setSharing(userId: string, friendUserId: string, on: boolean): Promise<void> {
    const pair = pairOf(userId, friendUserId);
    const data = userId === pair.userAId ? { userASharing: on } : { userBSharing: on };
    await this.visibility.announceRemovals(userId, async () => {
      const { count } = await this.prisma.friendship.updateMany({
        where: { ...pair, acceptedAt: { not: null } },
        data,
      });
      if (count === 0) {
        throw friendNotFound();
      }
    });
  }

  // For other features, such as one that lets a User act only towards a Friend.
  async areFriends(userId: string, otherUserId: string, tx: Prisma.TransactionClient = this.prisma): Promise<boolean> {
    const row = await tx.friendship.findUnique({ where: { userAId_userBId: pairOf(userId, otherUserId) } });
    return row !== null && row.acceptedAt !== null;
  }

  // Answers the waiting Friend Request that `where` finds. `change` answers how many rows it changed, none when the
  // request was answered in the meantime.
  private async answer(
    where: Prisma.FriendshipWhereInput,
    change: (tx: Prisma.TransactionClient) => Promise<number>,
  ): Promise<void> {
    const request = await this.prisma.friendship.findFirst({ where: { ...where, acceptedAt: null } });
    if (request === null) {
      throw friendRequestNotFound();
    }
    await this.changeBetween(request, async (tx) => {
      if ((await change(tx)) === 0) {
        throw friendRequestNotFound();
      }
    });
  }

  // Every change between two Users locks both in the order of their ids first, so that changes between the same two
  // run one after another and each sees what the one before left. Tells both apps once the change is stored.
  private async changeBetween<T>(pair: Pair, change: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(pair.userAId, tx);
      await this.users.lock(pair.userBId, tx);
      return change(tx);
    });
    this.signals.send([pair.userAId, pair.userBId], 'friends-changed');
    return result;
  }
}
