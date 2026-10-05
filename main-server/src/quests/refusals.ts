import { ConflictException, HttpStatus, NotFoundException } from '@nestjs/common';

export const notFound = (code: string, message: string): NotFoundException =>
  new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, error: 'Not Found', code, message });

export const conflict = (code: string, message: string): ConflictException =>
  new ConflictException({ statusCode: HttpStatus.CONFLICT, error: 'Conflict', code, message });

export const questNotFound = (): NotFoundException => notFound('QUEST_NOT_FOUND', 'This User holds no such Quest.');
