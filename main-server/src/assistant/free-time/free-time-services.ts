/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { FriendsService } from '../../friends/friends.service.js';
import { MenusService } from '../../menus/menus.service.js';
import { RestaurantPlaces } from '../../menus/restaurant-places.js';
import { type CandidateServices } from './candidates.js';
import { UserDayService } from './user-day.service.js';

// What the 공강 tools call.
export interface FreeTimeServices extends CandidateServices {
  days: UserDayService;
  friends: FriendsService;
  menus: MenusService;
  restaurantPlaces: RestaurantPlaces;
}
