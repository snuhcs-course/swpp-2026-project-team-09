// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by TaeHyun79 and fyoon46 in #43 #74
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { JoinPolicy, Prisma, Weekday } from '../generated/prisma/client.js';
import { StoredClass } from '../timetable/dto/timetable.dto.js';
import { TimetableService } from '../timetable/timetable.service.js';
import { HOLDER_SELECT, HolderDto, QuestDto, SubQuestDto } from './dto/quest.dto.js';
import { conflict } from './refusals.js';

// Asia/Seoul keeps +09:00 all year.
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

// The date in Asia/Seoul as `YYYY-MM-DD`, and its weekday.
function seoulDay(now: Date): { date: string; weekday: Weekday | undefined } {
  const seoul = new Date(now.getTime() + SEOUL_OFFSET_MS);
  // getUTCDay counts from Sunday, Weekday from Monday.
  return { date: seoul.toISOString().slice(0, 10), weekday: Object.values(Weekday)[(seoul.getUTCDay() + 6) % 7] };
}

// The class with its times on `date`.
function toClassQuestDto(
  { id, courseName }: StoredClass,
  times: StoredClass['times'],
  holder: HolderDto,
  date: string,
  now: Date,
): QuestDto {
  const subQuests = times.map(({ id: timeId, startTime, endTime, place, room }): SubQuestDto => {
    const endsAt = new Date(`${date}T${endTime}:00+09:00`);
    return {
      id: timeId,
      attending: false,
      title: courseName,
      startsAt: new Date(`${date}T${startTime}:00+09:00`).toISOString(),
      endsAt: endsAt.toISOString(),
      place:
        place === null
          ? null
          : {
              placeId: place.id,
              label: room === null ? place.name : `${place.name} ${room}`,
              latitude: place.latitude,
              longitude: place.longitude,
            },
      completion: 'by_time',
      cancelled: false,
      done: false,
      ended: endsAt <= now,
    };
  });
  return {
    id,
    title: courseName,
    globalEvent: null,
    leader: null,
    capacity: 1,
    joinPolicy: JoinPolicy.closed,
    board: null,
    description: '',
    createdAt: null,
    holders: [holder],
    subQuests,
    classQuest: true,
    waitingJoinRequests: 0,
  };
}

// Class Quests are computed from the timetable each time they are read, and never stored (README.md: Quests).
@Injectable()
export class ClassQuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timetable: TimetableService,
  ) {}

  // A Class Quest for each of the User's classes with a time today, in the order of their first start, each with a Sub
  // Quest for each of its times today.
  async todayFor(userId: string, now: Date): Promise<QuestDto[]> {
    const { date, weekday } = seoulDay(now);
    const today = (await this.timetable.classesOf(userId))
      .flatMap((one) => {
        const times = one.times.filter((time) => time.weekday === weekday);
        return times.length === 0 ? [] : [{ one, times }];
      })
      .toSorted(
        (a, b) =>
          (a.times[0]?.startTime ?? '').localeCompare(b.times[0]?.startTime ?? '') || a.one.id.localeCompare(b.one.id),
      );
    if (today.length === 0) {
      return [];
    }
    const holder = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: HOLDER_SELECT });
    return today.map(({ one, times }) => toClassQuestDto(one, times, holder, date, now));
  }

  // The Class Quest with this identifier, or null when it is none of the User's today.
  async todayOne(userId: string, questId: string, now: Date): Promise<QuestDto | null> {
    return (await this.todayFor(userId, now)).find(({ id }) => id === questId) ?? null;
  }

  // Refuses an identifier of one of the User's classes, on any day. Asked once no stored Quest answered it, so that
  // stored Quests are served as before.
  async refuse(userId: string, questId: string, db: Prisma.TransactionClient = this.prisma): Promise<void> {
    if (await this.timetable.isClassOf(userId, questId, db)) {
      throw conflict('CLASS_QUEST', 'A Class Quest comes from the timetable and cannot be changed, joined or led.');
    }
  }
}
