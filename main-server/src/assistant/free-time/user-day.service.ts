/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PlaceLookup } from '../../places/place-lookup.js';
import { QuestsService } from '../../quests/quests.service.js';
import { TimetableService } from '../../timetable/timetable.service.js';
import { koreaDate } from '../korea-time.js';
import { busyEnd, dateOf, type DayItem, onDay, weekdayOf } from './free-time.js';

// The items of any User's day, read from their Timetable and the Quests they hold.
@Injectable()
export class UserDayService {
  constructor(
    private readonly timetable: TimetableService,
    private readonly quests: QuestsService,
    private readonly places: PlaceLookup,
  ) {}

  async itemsOn(userId: string, date: string): Promise<DayItem[]> {
    const [meetings, subQuests] = await Promise.all([this.classesOn(userId, date), this.quests.heldSubQuests(userId)]);
    const timed = subQuests.flatMap(({ id, questTitle, startsAt, endsAt, place, cancelled }) => {
      const start = dateOf(startsAt);
      if (cancelled || start === null || koreaDate(start) !== date) {
        return [];
      }
      const end = busyEnd(start, dateOf(endsAt));
      return [{ id, name: questTitle, start, end, placeId: this.places.placeIdOf(place), isClass: false }];
    });
    return [...meetings, ...timed];
  }

  // The Class meetings of the day, read from the Timetable alone.
  async classesOn(userId: string, date: string): Promise<DayItem[]> {
    const weekday = weekdayOf(date);
    return (await this.timetable.classesOf(userId)).flatMap(({ courseName, times }) =>
      times
        .filter((time) => time.weekday === weekday)
        .map(({ id, startTime, endTime, placeId }) => ({
          id,
          name: courseName,
          start: onDay(date, startTime),
          end: onDay(date, endTime),
          placeId,
          isClass: true,
        })),
    );
  }
}
