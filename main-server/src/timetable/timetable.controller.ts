import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type SaveClassDto, saveClassSchema } from './dto/save-class.dto.js';
import { TimetableClassDto } from './dto/timetable.dto.js';
import { TimetableService } from './timetable.service.js';

// The routes name no User, so they never reach another User's timetable.
@Controller('timetable/classes')
export class TimetableController {
  constructor(private readonly timetable: TimetableService) {}

  @Get()
  read(@CurrentUser() user: SignedInUser): Promise<TimetableClassDto[]> {
    return this.timetable.timetableOf(user.id);
  }

  // No rule stops a second class with the same fields, so a repeat needs the key.
  @Post()
  @Idempotent({ required: true })
  add(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: saveClassSchema }) body: SaveClassDto,
  ): Promise<TimetableClassDto> {
    return this.timetable.addClass(user.id, body);
  }

  @Put(':classId')
  replace(
    @CurrentUser() user: SignedInUser,
    @Param('classId', { schema: z.uuid() }) classId: string,
    @Body({ schema: saveClassSchema }) body: SaveClassDto,
  ): Promise<TimetableClassDto> {
    return this.timetable.replaceClass(user.id, classId, body);
  }

  @Delete(':classId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: SignedInUser, @Param('classId', { schema: z.uuid() }) classId: string): Promise<void> {
    return this.timetable.deleteClass(user.id, classId);
  }

  // A repeat changes nothing, so it needs no key.
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  reset(@CurrentUser() user: SignedInUser): Promise<void> {
    return this.timetable.reset(user.id);
  }
}
