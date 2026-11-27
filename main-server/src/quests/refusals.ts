/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { ConflictException, ForbiddenException, HttpStatus, NotFoundException } from '@nestjs/common';

export const notFound = (code: string, message: string): NotFoundException =>
  new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, error: 'Not Found', code, message });

// `details` adds what the client needs to act on the refusal.
export const conflict = (code: string, message: string, details: object = {}): ConflictException =>
  new ConflictException({ statusCode: HttpStatus.CONFLICT, error: 'Conflict', code, message, ...details });

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

// Its Holders fill its places: nobody enters it, and the Leader invites nobody into it.
export const questFull = (): ConflictException => conflict('QUEST_FULL', 'This Quest is full.');

// A User the Leader removed comes back only by the Leader's approval.
export const removedAsk = (): ConflictException =>
  conflict('QUEST_REMOVED_ASK', 'The Leader removed you from this Quest: ask to join it instead.');

export const sharedQuestHeld = (): ConflictException =>
  conflict('SHARED_QUEST_HELD', 'The User holds a Shared Quest for this Global Event.');

// A Quest taken alone gathers nobody: no one is invited into it and its settings stay (P03 ticket 17).
export const takenAloneRefused = (): ConflictException =>
  conflict('QUEST_TAKEN_ALONE', 'A Quest taken alone gathers nobody.');
