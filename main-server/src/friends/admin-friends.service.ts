// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { BadRequestException, ConflictException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { AdminFriendDto, AdminUserDto, byName } from './dto/friends.dto.js';
import { FriendsService, ofUser } from './friends.service.js';

const userNotFound = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'USER_NOT_FOUND',
    message: 'No User has this id.',
  });

const ACCEPTED = { acceptedAt: { not: null } } satisfies Prisma.FriendshipWhereInput;

const FRIEND_SELECT = {
  select: { id: true, name: true, email: true, department: true, friendId: true },
} satisfies Prisma.UserDefaultArgs;

// What an Administrator reads and changes of Users, for setting up demo accounts. A change goes through
// FriendsService, so that it locks the two Users as a change by either of them does.
@Injectable()
export class AdminFriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendsService,
  ) {}

  // By name in the Korean order, then by email address, the Users before onboarding last.
  async listUsers(): Promise<AdminUserDto[]> {
    const users = await this.prisma.user.findMany({
      include: { _count: { select: { friendshipsAsA: { where: ACCEPTED }, friendshipsAsB: { where: ACCEPTED } } } },
    });
    return users
      .toSorted(
        (a, b) =>
          Number(a.onboardedAt === null) - Number(b.onboardedAt === null) ||
          a.name.localeCompare(b.name, 'ko') ||
          (a.email < b.email ? -1 : Number(a.email > b.email)),
      )
      .map(({ id, name, email, department, friendId, onboardedAt, _count }) => ({
        id,
        name,
        email,
        department,
        friendId,
        onboarded: onboardedAt !== null,
        friendCount: _count.friendshipsAsA + _count.friendshipsAsB,
      }));
  }

  // In the order of the User's own list.
  async listFriends(userId: string): Promise<AdminFriendDto[]> {
    if ((await this.prisma.user.findUnique({ where: { id: userId } })) === null) {
      throw userNotFound();
    }
    const rows = await this.prisma.friendship.findMany({
      where: { ...ACCEPTED, ...ofUser(userId) },
      include: { userA: FRIEND_SELECT, userB: FRIEND_SELECT },
    });
    return rows
      .flatMap(({ userAId, userA, userB, acceptedAt }) =>
        acceptedAt === null ? [] : [{ ...(userAId === userId ? userB : userA), since: acceptedAt.toISOString() }],
      )
      .toSorted(byName);
  }

  // As an accepted Friend Request: a waiting one between the two keeps its sender, and otherwise the sender is
  // `userAId`.
  async befriend(userAId: string, userBId: string): Promise<void> {
    if (userAId === userBId) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        code: 'SAME_USER',
        message: 'A User cannot be their own Friend.',
      });
    }
    const users = await this.prisma.user.findMany({ where: { id: { in: [userAId, userBId] } } });
    if (users.length < 2) {
      throw userNotFound();
    }
    if (users.some(({ onboardedAt }) => onboardedAt === null)) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        code: 'USER_NOT_ONBOARDED',
        message: 'A User before onboarding cannot be made a Friend.',
      });
    }
    await this.friends.befriend(userAId, userBId, () => Promise.resolve());
  }
}
