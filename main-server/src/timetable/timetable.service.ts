import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SaveClassDto } from './dto/save-class.dto.js';
import { TimetableClassDto, TimetableDto, toTimetableDto } from './dto/timetable.dto.js';
import { UpdateSemesterDto } from './dto/update-semester.dto.js';

// A `date` column holds the calendar day of the Date in UTC. `undefined` leaves the column as it is.
function dateColumn(day: string | null | undefined): Date | null | undefined {
  return typeof day === 'string' ? new Date(`${day}T00:00:00Z`) : day;
}

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  // Only the User's own: every query is filtered by the User. Class Quests read it too.
  async timetableOf(userId: string): Promise<TimetableDto> {
    return toTimetableDto(await this.prisma.timetable.findUnique({ where: { userId }, include: { classes: true } }));
  }

  async updateSemester(userId: string, days: UpdateSemesterDto): Promise<TimetableDto> {
    const data = {
      semesterFirstDay: dateColumn(days.semesterFirstDay),
      semesterLastDay: dateColumn(days.semesterLastDay),
    };
    await this.prisma.$transaction(async (tx) => {
      // The day not sent is the stored one, which the update's row lock keeps until the check is done.
      const { semesterFirstDay, semesterLastDay } = await tx.timetable.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
      if (semesterFirstDay !== null && semesterLastDay !== null && semesterLastDay < semesterFirstDay) {
        throw new BadRequestException(['semesterLastDay: must not be before semesterFirstDay']);
      }
    });
    return this.timetableOf(userId);
  }

  async addClass(userId: string, saved: SaveClassDto): Promise<TimetableClassDto> {
    await this.checkPlace(saved.placeId);
    const { id: timetableId } = await this.prisma.timetable.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    const { id } = await this.prisma.timetableClass.create({ data: { timetableId, ...saved } });
    return this.classOf(userId, id);
  }

  async editClass(userId: string, id: string, saved: SaveClassDto): Promise<TimetableClassDto> {
    await this.checkPlace(saved.placeId);
    const { count } = await this.prisma.timetableClass.updateMany({
      where: { id, timetable: { userId } },
      data: saved,
    });
    if (count === 0) {
      throw new NotFoundException('No class of your timetable has this id.');
    }
    return this.classOf(userId, id);
  }

  async deleteClass(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.timetableClass.deleteMany({ where: { id, timetable: { userId } } });
    if (count === 0) {
      throw new NotFoundException('No class of your timetable has this id.');
    }
  }

  private async checkPlace(id: string): Promise<void> {
    if ((await this.prisma.place.count({ where: { id } })) === 0) {
      throw new BadRequestException(['placeId: no Place of the list has this id']);
    }
  }

  // With the classes it overlaps, which only the whole timetable tells.
  private async classOf(userId: string, id: string): Promise<TimetableClassDto> {
    const found = (await this.timetableOf(userId)).classes.find((timetableClass) => timetableClass.id === id);
    if (found === undefined) {
      throw new NotFoundException('No class of your timetable has this id.');
    }
    return found;
  }
}
