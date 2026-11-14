/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { LocationSharingService } from '../location-sharing/location-sharing.service.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { type FriendView } from './dto/friend-view.dto.js';
import { FriendsService } from './friends.service.js';

// What a viewer sees of each Friend, read from today's switches: a Friend whose position the viewer may see now is
// exact, and every other Friend is at the Timetable. The Assistant reads Friends only through it.
@Injectable()
export class FriendViewService {
  constructor(
    private readonly friends: FriendsService,
    private readonly locations: LocationSharingService,
    private readonly places: PlaceLookup,
  ) {}

  // Every Friend of the viewer, in the order of GET /friends.
  async list(viewerId: string): Promise<FriendView[]> {
    const [friends, positions] = await Promise.all([
      this.friends.listFriends(viewerId),
      this.locations.visiblePositions(viewerId),
    ]);
    const seen = new Map(positions.map((position) => [position.userId, position]));
    return friends.map(({ id, name, department }): FriendView => {
      const kept = seen.get(id);
      if (kept === undefined) {
        return { id, name, department, level: 'timetable', position: null, placeId: null };
      }
      const position = { latitude: kept.latitude, longitude: kept.longitude, measuredAt: kept.measuredAt };
      return { id, name, department, level: 'exact', position, placeId: this.places.at(position)?.place.id ?? null };
    });
  }
}
