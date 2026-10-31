/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PlaceLookup } from '../../places/place-lookup.js';
import { QuestsService } from '../../quests/quests.service.js';
import { TimetableService } from '../../timetable/timetable.service.js';
import { koreaDate } from '../korea-time.js';
import { busyEnd, type DayItem, onDay, weekdayOf } from './free-time.js';

// The items of any User's day, read from their Timetable and the Quests they hold.
@Injectable()
export class UserDayService {
  constructor(
    private readonly timetable: TimetableService,
    private readonly quests: QuestsService,
    private readonly places: PlaceLookup,
  ) {}

  async itemsOn(userId: string, date: string): Promise<DayItem[]> {
    const [classes, subQuests] = await Promise.all([
      this.timetable.classesOf(userId),
      this.quests.heldSubQuests(userId),
    ]);
    const weekday = weekdayOf(date);
    const meetings = classes.flatMap(({ courseName, times }) =>
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
    const timed = subQuests.flatMap(({ id, questTitle, startsAt, endsAt, place, cancelled }) => {
      const start = startsAt === null ? null : new Date(startsAt);
      if (cancelled || start === null || koreaDate(start) !== date) {
        return [];
      }
      const end = busyEnd(start, endsAt === null ? null : new Date(endsAt));
      return [{ id, name: questTitle, start, end, placeId: this.places.placeIdOf(place), isClass: false }];
    });
    return [...meetings, ...timed];
  }
}
