import { ConflictException, ForbiddenException, HttpStatus, NotFoundException } from '@nestjs/common';

export const notFound = (code: string, message: string): NotFoundException =>
  new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, error: 'Not Found', code, message });

export const conflict = (code: string, message: string, more: object = {}): ConflictException =>
  new ConflictException({ statusCode: HttpStatus.CONFLICT, error: 'Conflict', code, message, ...more });

export const notInParty = (): NotFoundException => notFound('NOT_IN_PARTY', 'The User is in no Party.');

export const notLeader = (): ForbiddenException =>
  new ForbiddenException({
    statusCode: HttpStatus.FORBIDDEN,
    error: 'Forbidden',
    code: 'NOT_PARTY_LEADER',
    message: 'Only the Leader of the Party does this.',
  });

export const alreadyMember = (): ConflictException =>
  conflict('ALREADY_MEMBER', 'This User is a member of this Party.');
