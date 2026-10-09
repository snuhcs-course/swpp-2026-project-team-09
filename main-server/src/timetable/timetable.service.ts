// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #37 #43
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { conflict, notFound } from '../quests/refusals.js';
import { UsersService } from '../users/users.service.js';
import { SaveClassDto } from './dto/save-class.dto.js';
import { CLASS_INCLUDE, StoredClass, TimetableClassDto, toTimetableDto } from './dto/timetable.dto.js';

const CLASS_LIMIT = 15;

const classNotFound = (): NotFoundException => notFound('CLASS_NOT_FOUND', 'The User has no such class.');

@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  // The User's classes, each with its times in the order of the week and their Places.
  classesOf(userId: string, db: Prisma.TransactionClient = this.prisma): Promise<StoredClass[]> {
    return db.timetableClass.findMany({ where: { userId }, include: CLASS_INCLUDE });
  }

  async isClassOf(userId: string, classId: string, db: Prisma.TransactionClient = this.prisma): Promise<boolean> {
    return (await db.timetableClass.count({ where: { id: classId, userId } })) > 0;
  }

  async timetableOf(userId: string): Promise<TimetableClassDto[]> {
    return toTimetableDto(await this.classesOf(userId));
  }

  // The User's row is locked, so that adds at the same moment are counted one after another.
  addClass(userId: string, { courseName, times }: SaveClassDto): Promise<TimetableClassDto> {
    return this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      if ((await tx.timetableClass.count({ where: { userId } })) >= CLASS_LIMIT) {
        throw conflict('TIMETABLE_FULL', `The User has ${CLASS_LIMIT} classes already.`);
      }
      await this.checkPlaces(times, tx);
      const { id } = await tx.timetableClass.create({ data: { userId, courseName, times: { create: times } } });
      return this.answer(userId, id, tx);
    });
  }

  // Updating the class first finds it among the User's and locks it, before anything about the body is checked.
  replaceClass(userId: string, id: string, { courseName, times }: SaveClassDto): Promise<TimetableClassDto> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.timetableClass.updateMany({ where: { id, userId }, data: { courseName } });
      if (count === 0) {
        throw classNotFound();
      }
      await this.checkPlaces(times, tx);
      await tx.classTime.deleteMany({ where: { classId: id } });
      await tx.classTime.createMany({ data: times.map((time) => ({ classId: id, ...time })) });
      return this.answer(userId, id, tx);
    });
  }

  // Its times go with it.
  async deleteClass(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.timetableClass.deleteMany({ where: { id, userId } });
    if (count === 0) {
      throw classNotFound();
    }
  }

  async reset(userId: string): Promise<void> {
    await this.prisma.timetableClass.deleteMany({ where: { userId } });
  }

  private async checkPlaces(times: SaveClassDto['times'], tx: Prisma.TransactionClient): Promise<void> {
    const ids = new Set(times.flatMap(({ placeId }) => (placeId === null ? [] : [placeId])));
    if ((await tx.place.count({ where: { id: { in: [...ids] } } })) < ids.size) {
      throw notFound('PLACE_NOT_FOUND', 'No such Place is in the list.');
    }
  }

  // The class with the classes it overlaps, which only the whole timetable tells.
  private async answer(userId: string, id: string, tx: Prisma.TransactionClient): Promise<TimetableClassDto> {
    const answer = toTimetableDto(await this.classesOf(userId, tx)).find((one) => one.id === id);
    if (answer === undefined) {
      throw classNotFound();
    }
    return answer;
  }
}
