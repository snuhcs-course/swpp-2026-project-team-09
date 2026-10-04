import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { Place } from '../generated/prisma/client.js';
import { TimetableClassDto, WEEK } from '../timetable/dto/timetable.dto.js';
import { TimetableService } from '../timetable/timetable.service.js';
import { HolderDto, QuestDto } from './dto/quest.dto.js';

// The calendar day of `now` in Asia/Seoul, as `YYYY-MM-DD`.
function seoulDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
}

// The room follows the Place's name in the label, where the app shows a Sub Quest's place.
function toClassQuestDto(
  { id, courseName, startTime, endTime, room }: TimetableClassDto,
  place: Place,
  holder: HolderDto,
  day: string,
  now: Date,
): QuestDto {
  const endsAt = new Date(`${day}T${endTime}:00+09:00`);
  return {
    id,
    title: courseName,
    globalEvent: null,
    holders: [holder],
    subQuests: [
      {
        id,
        attending: false,
        title: courseName,
        startsAt: new Date(`${day}T${startTime}:00+09:00`).toISOString(),
        endsAt: endsAt.toISOString(),
        place: {
          placeId: place.id,
          label: room === null ? place.name : `${place.name} ${room}`,
          latitude: place.latitude,
          longitude: place.longitude,
        },
        completion: 'by_time',
        cancelled: false,
        done: false,
        ended: endsAt <= now,
      },
    ],
    classQuest: true,
  };
}

// Class Quests are computed from the timetable when the list is read, and never stored. A Class Quest and its one Sub
// Quest take the class's id.
@Injectable()
export class ClassQuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timetable: TimetableService,
  ) {}

  // A Class Quest for each of the User's classes held today, within the semester's days where they are set, by start.
  async todayFor(userId: string, now: Date): Promise<QuestDto[]> {
    const { semesterFirstDay, semesterLastDay, classes } = await this.timetable.timetableOf(userId);
    const day = seoulDay(now);
    if ((semesterFirstDay !== null && day < semesterFirstDay) || (semesterLastDay !== null && day > semesterLastDay)) {
      return [];
    }
    // getUTCDay counts from Sunday, WEEK from Monday.
    const weekday = WEEK[(new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7];
    const today = classes
      .filter(({ weekdays }) => weekdays.includes(weekday))
      .toSorted((one, other) => one.startTime.localeCompare(other.startTime));
    if (today.length === 0) {
      return [];
    }
    const [holder, places] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, department: true } }),
      this.prisma.place.findMany({ where: { id: { in: today.map(({ placeId }) => placeId) } } }),
    ]);
    return today.flatMap((timetableClass) => {
      const place = places.find(({ id }) => id === timetableClass.placeId);
      return place === undefined ? [] : [toClassQuestDto(timetableClass, place, holder, day, now)];
    });
  }

  // Refuses a change to a Class Quest: an id of one of the User's classes, on any day.
  async refuseChange(userId: string, questId: string): Promise<void> {
    if ((await this.timetable.timetableOf(userId)).classes.some(({ id }) => id === questId)) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        code: 'CLASS_QUEST',
        message: 'A Class Quest comes from the timetable and cannot be changed.',
      });
    }
  }
}
