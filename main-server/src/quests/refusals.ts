import { ConflictException, ForbiddenException, HttpStatus, NotFoundException } from '@nestjs/common';

export const notFound = (code: string, message: string): NotFoundException =>
  new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, error: 'Not Found', code, message });

export const conflict = (code: string, message: string): ConflictException =>
  new ConflictException({ statusCode: HttpStatus.CONFLICT, error: 'Conflict', code, message });

export const questNotFound = (): NotFoundException => notFound('QUEST_NOT_FOUND', 'This User holds no such Quest.');

// A Quest that does not exist, or one that takes nobody but by invitation, which it does not show.
export const notRecruiting = (): NotFoundException => notFound('QUEST_NOT_FOUND', 'No such Quest takes this User.');

export const notLeader = (): ForbiddenException =>
  new ForbiddenException({
    statusCode: HttpStatus.FORBIDDEN,
    error: 'Forbidden',
    code: 'NOT_QUEST_LEADER',
    message: 'Only the Leader of the Quest does this.',
  });

export const alreadyHolder = (): ConflictException => conflict('ALREADY_HOLDER', 'The User holds this Quest already.');

export const sharedQuestHeld = (): ConflictException =>
  conflict('SHARED_QUEST_HELD', 'The User holds a Shared Quest for this Global Event.');
