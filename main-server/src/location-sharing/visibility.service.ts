import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { PositionStore } from './position-store.js';

// Answers who may see whom now. A viewer may see a subject when both Master Switches are on, the subject has a
// position (only one inside the Campus Boundary is kept), and a relationship between the two has its switch on at both
// ends. Sharing is mutual, so the rule reads the same from either User's side.
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

  // Runs a change to the User's switches, relationships or position, and sends `position-removed` at once to each viewer
  // who could see a subject before the change and cannot after it. Every sight such a change can end includes the
  // User, so comparing the sights around the User finds them all.
  async announceRemovals<T>(userId: string, change: () => Promise<T>): Promise<T> {
    const before = await this.sightsAround(userId);
    const result = await change();
    const after = await this.sightsAround(userId);
    for (const [subjectId, viewerIds] of before) {
      const still = after.get(subjectId) ?? [];
      this.signals.send(
        viewerIds.filter((viewerId) => !still.includes(viewerId)),
        'position-removed',
        { userId: subjectId },
      );
    }
    return result;
  }

  // Who sees whom of the pairs that include the User: each subject with their viewers.
  private async sightsAround(userId: string): Promise<Map<string, string[]>> {
    const linked = await this.linkedTo(userId);
    const positions = await this.positions.read([userId, ...linked]);
    const sights = new Map<string, string[]>();
    if (positions.has(userId)) {
      sights.set(userId, linked);
    }
    for (const otherId of linked) {
      if (positions.has(otherId)) {
        sights.set(otherId, [userId]);
      }
    }
    return sights;
  }

  // The Users with whom the User shares their location now, whether or not either has a position: both Master Switches
  // are on, and a relationship between the two has its switch on at both ends.
  private async linkedTo(userId: string): Promise<string[]> {
    const related = await this.sharingFriendsOf(userId);
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
}
