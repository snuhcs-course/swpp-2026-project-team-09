/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { type FriendLevel, Prisma } from '../generated/prisma/client.js';
import { levelsAbove } from '../location-sharing/friend-level.js';
import { VisibilityService } from '../location-sharing/visibility.service.js';
import { type AskedDto, type AskLevelDto, endOf } from './dto/friends.dto.js';
import { friendNotFound } from './friends.service.js';

type AskedColumn = 'userAOffAskedAt' | 'userBOffAskedAt' | 'userAPlanAskedAt' | 'userBPlanAskedAt';

type AskedAt = (at: Date | null) => Partial<Record<AskedColumn, Date | null>>;

// The column of each moment at each end of a friendship.
const ASKED_AT: Record<AskedDto['moment'], { a: AskedAt; b: AskedAt }> = {
  off: { a: (at) => ({ userAOffAskedAt: at }), b: (at) => ({ userBOffAskedAt: at }) },
  plan: { a: (at) => ({ userAPlanAskedAt: at }), b: (at) => ({ userBPlanAskedAt: at }) },
};

// The friendships between the User and any of these Users.
function withAny(userId: string, otherIds: readonly string[]): Prisma.FriendshipWhereInput {
  const others = [...otherIds];
  return {
    acceptedAt: { not: null },
    OR: [
      { userAId: userId, userBId: { in: others } },
      { userBId: userId, userAId: { in: others } },
    ],
  };
}

// The app asks a User once at each of two moments, about a Friend or about the Master Switch, and the server keeps
// when it first asked. Nothing of a question is told to the other User.
@Injectable()
export class FriendAsksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  async record(userId: string, { userIds, moment }: AskedDto): Promise<void> {
    const friendIds = [...new Set(userIds)];
    if ((await this.prisma.friendship.count({ where: withAny(userId, friendIds) })) !== friendIds.length) {
      throw friendNotFound();
    }
    const { a, b } = ASKED_AT[moment];
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.friendship.updateMany({
        where: { userAId: userId, userBId: { in: friendIds }, ...a(null) },
        data: a(now),
      }),
      this.prisma.friendship.updateMany({
        where: { userBId: userId, userAId: { in: friendIds }, ...b(null) },
        data: b(now),
      }),
    ]);
  }

  async recordMasterOff(userId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: userId, masterOffAskedAt: null },
      data: { masterOffAskedAt: new Date() },
    });
  }

  // Lowers every Friend above the level to it at the User's end, as a change of each level does.
  async lowerAll(userId: string, level: FriendLevel): Promise<void> {
    const above = levelsAbove(level);
    await this.visibility.announceRemovals(userId, () =>
      this.prisma.$transaction([
        this.prisma.friendship.updateMany({
          where: { userAId: userId, acceptedAt: { not: null }, userALevel: { in: above } },
          data: { userALevel: level },
        }),
        this.prisma.friendship.updateMany({
          where: { userBId: userId, acceptedAt: { not: null }, userBLevel: { in: above } },
          data: { userBLevel: level },
        }),
      ]),
    );
  }

  // The Friends among these whom the User was not asked about after a Plan yet, in the order given, each with the
  // User's end.
  async notAskedAfterPlan(userId: string, friendIds: readonly string[]): Promise<AskLevelDto[]> {
    const rows = await this.prisma.friendship.findMany({
      where: withAny(userId, friendIds),
      include: { userA: { select: { name: true } }, userB: { select: { name: true } } },
    });
    const unasked = new Map<string, AskLevelDto>();
    for (const row of rows) {
      const { level, planAskedAt } = endOf(row, userId);
      const [friendId, { name }] = row.userAId === userId ? [row.userBId, row.userB] : [row.userAId, row.userA];
      if (planAskedAt === null) {
        unasked.set(friendId, { userId: friendId, name, level });
      }
    }
    return friendIds.flatMap((id) => unasked.get(id) ?? []);
  }
}
