/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { freeTimeOf, type FreeInterval } from '../free-time/free-time.js';
import { type UserDayService } from '../free-time/user-day.service.js';

// The seam between findLibraryFreeSlots and P04's Free Time, so that the P6 eval world can bind a day of its own.
export const FREE_TIME_PORT = 'FREE_TIME_PORT';

export interface FreeTimePort {
  // The User's Free Time that day, none of it before now.
  freeTimeOn(userId: string, date: string, now: Date): Promise<FreeInterval[]>;
}

// The server's: the User's Classes and held Sub Quests that day, through P04's freeTimeOf.
export function userDayFreeTime(days: UserDayService): FreeTimePort {
  return {
    freeTimeOn: async (userId, date, now) => freeTimeOf(await days.itemsOn(userId, date), date, now),
  };
}
