/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { PositionStore } from './position-store.js';

// Answers who may see whom now. A viewer may see a subject when both Master Switches are on, the subject has a
// position (only one inside the Campus Boundary is kept), and a relationship between the two has its switch on at both
// ends: a friendship or a common Party. Sharing is mutual, so the rule reads the same from either User's side.
@Injectable()
export class VisibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly positions: PositionStore,
    private readonly signals: SignalsService,
  ) {}

  // Who may see the subject now, to whom a new position of the subject goes.
  async viewersOf(subjectId: string): Promise<string[]> {
    const position = await this.positions.read([subjectId]);
    return position.has(subjectId) ? this.linkedTo(subjectId) : [];
  }

  // Whom the viewer may see now.
  async visibleTo(viewerId: string): Promise<string[]> {
    const linked = await this.linkedTo(viewerId);
    const positions = await this.positions.read(linked);
    return linked.filter((userId) => positions.has(userId));
  }

  // Runs a change to the switches, relationships or position of the User, or of several Users at once, and sends
  // `position-removed` at once to each viewer who could see a subject before the change and cannot after it. Every
  // sight such a change can end includes one of the Users, so comparing the sights around them finds them all.
  async announceRemovals<T>(userIds: string | readonly string[], change: () => Promise<T>): Promise<T> {
    const around = typeof userIds === 'string' ? [userIds] : userIds;
    const before = await this.sightsAround(around);
    const result = await change();
    const after = await this.sightsAround(around);
    for (const [subjectId, viewerIds] of before) {
      const still = after.get(subjectId);
      this.signals.send(
        [...viewerIds].filter((viewerId) => still?.has(viewerId) !== true),
        'position-removed',
        { userId: subjectId },
      );
    }
    return result;
  }

  // Who sees whom of the pairs that include one of the Users: each subject with their viewers.
  private async sightsAround(userIds: readonly string[]): Promise<Map<string, Set<string>>> {
    const sights = new Map<string, Set<string>>();
    const sees = (viewerId: string, subjectId: string): void => {
      sights.set(subjectId, (sights.get(subjectId) ?? new Set()).add(viewerId));
    };
    const around = await Promise.all(
      userIds.map(async (userId) => {
        const linked = await this.linkedTo(userId);
        return { userId, linked, positions: await this.positions.read([userId, ...linked]) };
      }),
    );
    for (const { userId, linked, positions } of around) {
      for (const otherId of linked) {
        if (positions.has(userId)) {
          sees(otherId, userId);
        }
        if (positions.has(otherId)) {
          sees(userId, otherId);
        }
      }
    }
    return sights;
  }

  // The Users with whom the User shares their location now, whether or not either has a position: both Master Switches
  // are on, and a relationship between the two has its switch on at both ends.
  private async linkedTo(userId: string): Promise<string[]> {
    const related = [...new Set([...(await this.sharingFriendsOf(userId)), ...(await this.sharingMembersOf(userId))])];
    const switchedOn = await this.prisma.user.findMany({
      where: { id: { in: [userId, ...related] }, masterSwitchOn: true },
      select: { id: true },
    });
    const on = new Set(switchedOn.map(({ id }) => id));
    return on.has(userId) ? related.filter((id) => on.has(id)) : [];
  }

  // The relationship of a friendship, with its switch on at both ends.
  private async sharingFriendsOf(userId: string): Promise<string[]> {
    const rows = await this.prisma.friendship.findMany({
      where: {
        acceptedAt: { not: null },
        userASharing: true,
        userBSharing: true,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { userAId: true, userBId: true },
    });
    return rows.map(({ userAId, userBId }) => (userAId === userId ? userBId : userAId));
  }

  // The relationship of a common Party, with its switch on at both ends.
  private async sharingMembersOf(userId: string): Promise<string[]> {
    const rows = await this.prisma.partyMember.findMany({
      where: { userId: { not: userId }, sharing: true, party: { members: { some: { userId, sharing: true } } } },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  }
}
