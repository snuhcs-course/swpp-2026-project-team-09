/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { type FriendLevel } from '../generated/prisma/client.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { type PositionDto } from './dto/position.dto.js';
import { levelSeen } from './friend-level.js';
import { PositionStore, type StoredPosition } from './position-store.js';

// A level at which a viewer sees something of where a subject is.
export type SeenLevel = Exclude<FriendLevel, 'timetable'>;

// Who sees what of whom: each subject with what each of their viewers sees.
type Sights = Map<string, Map<string, PositionDto>>;

// Answers who sees what of whom now, by the rule of `levelSeen`: a viewer at 'exact' sees the subject's position, and
// one at 'building' only the Place the subject is in, never the position. Only a position inside the Campus Boundary is
// kept. The rule reads the same from either User's side.
@Injectable()
export class VisibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly positions: PositionStore,
    private readonly signals: SignalsService,
    private readonly places: PlaceLookup,
  ) {}

  // Who may see the subject now and at what level: to whom a new position of the subject goes, and in what form.
  async viewersOf(subjectId: string): Promise<Map<string, SeenLevel>> {
    const position = await this.positions.read([subjectId]);
    return position.has(subjectId) ? this.linkedTo(subjectId) : new Map();
  }

  // What the viewer sees now of each subject who shows them anything.
  async visibleTo(viewerId: string): Promise<Map<string, PositionDto>> {
    const linked = await this.linkedTo(viewerId);
    const positions = await this.positions.read([...linked.keys()]);
    const seen = new Map<string, PositionDto>();
    for (const [subjectId, level] of linked) {
      const shown = this.shown(subjectId, level, positions.get(subjectId));
      if (shown !== null) {
        seen.set(subjectId, shown);
      }
    }
    return seen;
  }

  // What a viewer at the level is given of the subject's stored position: the position at 'exact', and at 'building'
  // the Place it is in at the Place's own point, or nothing when it is in no Place.
  shown(subjectId: string, level: SeenLevel, stored: StoredPosition | undefined): PositionDto | null {
    if (stored === undefined) {
      return null;
    }
    const { latitude, longitude, measuredAt, placeId } = stored;
    if (level === 'exact') {
      return { userId: subjectId, latitude, longitude, measuredAt, level };
    }
    const place = placeId === null ? null : this.places.byId(placeId);
    return place === null
      ? null
      : {
          userId: subjectId,
          latitude: place.latitude,
          longitude: place.longitude,
          measuredAt,
          level,
          placeId: place.id,
        };
  }

  // Runs a change to the switches, levels, relationships, or position of the User, or of several Users at once, and
  // tells at once each viewer whose sight of a subject it changed: `position-removed` to one who sees nothing of the
  // subject after it, and `position` with the Place to one who sees only the subject's Place after it and saw the
  // position, another Place, or nothing before. One who sees the position after it gets the next upload. Every sight
  // such a change can alter includes one of the Users, so comparing the sights around them finds them all.
  async announceRemovals<T>(userIds: string | readonly string[], change: () => Promise<T>): Promise<T> {
    const around = typeof userIds === 'string' ? [userIds] : userIds;
    const before = await this.sightsAround(around);
    const result = await change();
    const after = await this.sightsAround(around);
    const none = new Map<string, PositionDto>();
    for (const subjectId of new Set([...before.keys(), ...after.keys()])) {
      this.announce(subjectId, before.get(subjectId) ?? none, after.get(subjectId) ?? none);
    }
    return result;
  }

  private announce(subjectId: string, before: Map<string, PositionDto>, after: Map<string, PositionDto>): void {
    const gone = [...before.keys()].filter((viewerId) => !after.has(viewerId));
    this.signals.send(gone, 'position-removed', { userId: subjectId });
    const placed = [...after].filter(([viewerId, now]) => {
      const was = before.get(viewerId);
      return now.level === 'building' && (was?.level !== 'building' || was.placeId !== now.placeId);
    });
    // Every viewer at the building is given the same Place of the subject.
    const [first] = placed;
    if (first !== undefined) {
      this.signals.send(
        placed.map(([viewerId]) => viewerId),
        'position',
        first[1],
      );
    }
  }

  // What each viewer sees of each subject, of the pairs that include one of the Users.
  private async sightsAround(userIds: readonly string[]): Promise<Sights> {
    const sights: Sights = new Map();
    const sees = (viewerId: string, subjectId: string, shown: PositionDto | null): void => {
      if (shown !== null) {
        sights.set(subjectId, (sights.get(subjectId) ?? new Map<string, PositionDto>()).set(viewerId, shown));
      }
    };
    const around = await Promise.all(
      userIds.map(async (userId) => {
        const linked = await this.linkedTo(userId);
        return { userId, linked, positions: await this.positions.read([userId, ...linked.keys()]) };
      }),
    );
    for (const { userId, linked, positions } of around) {
      for (const [otherId, level] of linked) {
        sees(otherId, userId, this.shown(userId, level, positions.get(userId)));
        sees(userId, otherId, this.shown(otherId, level, positions.get(otherId)));
      }
    }
    return sights;
  }

  // The Users who see something of where the User is, and whom the User sees, whether or not either has a position,
  // each at the level the rule gives them.
  private async linkedTo(userId: string): Promise<Map<string, SeenLevel>> {
    const [friends, members] = await Promise.all([this.friendLevelsOf(userId), this.sharingMembersOf(userId)]);
    const related = [...new Set([...friends.keys(), ...members])];
    const switchedOn = await this.prisma.user.findMany({
      where: { id: { in: [userId, ...related] }, masterSwitchOn: true },
      select: { id: true },
    });
    const on = new Set(switchedOn.map(({ id }) => id));
    const linked = new Map<string, SeenLevel>();
    for (const otherId of related) {
      const level = levelSeen({
        bothMasterSwitchesOn: on.has(userId) && on.has(otherId),
        commonParty: members.has(otherId),
        friendship: friends.get(otherId) ?? null,
      });
      if (level !== 'timetable') {
        linked.set(otherId, level);
      }
    }
    return linked;
  }

  // Each Friend of the User with the levels at the two ends of their friendship.
  private async friendLevelsOf(userId: string): Promise<Map<string, [FriendLevel, FriendLevel]>> {
    const rows = await this.prisma.friendship.findMany({
      where: { acceptedAt: { not: null }, OR: [{ userAId: userId }, { userBId: userId }] },
      select: { userAId: true, userBId: true, userALevel: true, userBLevel: true },
    });
    return new Map(
      rows.map(({ userAId, userBId, userALevel, userBLevel }) => [
        userAId === userId ? userBId : userAId,
        [userALevel, userBLevel],
      ]),
    );
  }

  // The members of the User's Party, when both have its switch on.
  private async sharingMembersOf(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.partyMember.findMany({
      where: { userId: { not: userId }, sharing: true, party: { members: { some: { userId, sharing: true } } } },
      select: { userId: true },
    });
    return new Set(rows.map((row) => row.userId));
  }
}
