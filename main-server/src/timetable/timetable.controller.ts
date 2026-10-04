import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type SaveClassDto, saveClassSchema } from './dto/save-class.dto.js';
import { TimetableClassDto, TimetableDto } from './dto/timetable.dto.js';
import { type UpdateSemesterDto, updateSemesterSchema } from './dto/update-semester.dto.js';
import { TimetableService } from './timetable.service.js';

// The routes name no User, so they never reach another User's timetable.
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetable: TimetableService) {}

  @Get()
  read(@CurrentUser() user: SignedInUser): Promise<TimetableDto> {
    return this.timetable.timetableOf(user.id);
  }

  @Patch()
  updateSemester(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: updateSemesterSchema }) body: UpdateSemesterDto,
  ): Promise<TimetableDto> {
    return this.timetable.updateSemester(user.id, body);
  }

  // No rule stops a second class with the same fields, so a repeat needs the key.
  @Post('classes')
  @Idempotent({ required: true })
  addClass(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: saveClassSchema }) body: SaveClassDto,
  ): Promise<TimetableClassDto> {
    return this.timetable.addClass(user.id, body);
  }

  @Put('classes/:id')
  editClass(
    @CurrentUser() user: SignedInUser,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: saveClassSchema }) body: SaveClassDto,
  ): Promise<TimetableClassDto> {
    return this.timetable.editClass(user.id, id, body);
  }

  @Delete('classes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteClass(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.timetable.deleteClass(user.id, id);
  }
}
