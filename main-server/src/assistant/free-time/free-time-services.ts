/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { FriendViewService } from '../../friends/friend-view.service.js';
import { MenusService } from '../../menus/menus.service.js';
import { RestaurantPlaces } from '../../menus/restaurant-places.js';
import { type CandidateServices } from './candidates.js';
import { UserDayService } from './user-day.service.js';

// What the 공강 tools call.
export interface FreeTimeServices extends CandidateServices {
  days: UserDayService;
  friends: FriendViewService;
  menus: MenusService;
  restaurantPlaces: RestaurantPlaces;
}
