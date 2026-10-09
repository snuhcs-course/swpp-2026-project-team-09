/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ConflictException, ForbiddenException, HttpStatus, NotFoundException } from '@nestjs/common';

export const notFound = (code: string, message: string): NotFoundException =>
  new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, error: 'Not Found', code, message });

export const conflict = (code: string, message: string, more: object = {}): ConflictException =>
  new ConflictException({ statusCode: HttpStatus.CONFLICT, error: 'Conflict', code, message, ...more });

export const notInParty = (): NotFoundException => notFound('NOT_IN_PARTY', 'The User is in no Party.');

// Also for a Party the User may not see, so that its existence stays hidden.
export const partyNotFound = (): NotFoundException => notFound('PARTY_NOT_FOUND', 'No such Party is running.');

export const notLeader = (): ForbiddenException =>
  new ForbiddenException({
    statusCode: HttpStatus.FORBIDDEN,
    error: 'Forbidden',
    code: 'NOT_PARTY_LEADER',
    message: 'Only the Leader of the Party does this.',
  });

export const alreadyMember = (): ConflictException =>
  conflict('ALREADY_MEMBER', 'This User is a member of this Party.');
