/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { answerDeadline } from '../src/library/room-answer-deadline.js';

const korea = (time: string): Date => new Date(`${time}+09:00`);

describe('The deadline of a room request’s answers', () => {
  it('is 20:00 in Korea on the day before a meeting on a later day', () => {
    expect(answerDeadline(korea('2026-11-02T10:00:00'), korea('2026-11-04T15:30:00'))).toEqual(
      korea('2026-11-03T20:00:00'),
    );
  });

  it('is the evening before for a meeting early the next morning', () => {
    expect(answerDeadline(korea('2026-11-03T09:00:00'), korea('2026-11-04T09:00:00'))).toEqual(
      korea('2026-11-03T20:00:00'),
    );
  });

  it('counts days in Korea, not in UTC', () => {
    // Made on 2026-11-02 and met on 2026-11-03 in UTC.
    expect(answerDeadline(korea('2026-11-03T08:30:00'), korea('2026-11-04T00:30:00'))).toEqual(
      korea('2026-11-03T20:00:00'),
    );
  });

  it.each([
    ['the meeting is on the day it was made', '2026-11-04T10:00:00', '2026-11-04T15:30:00'],
    ['it was made at 20:00 the day before', '2026-11-03T20:00:00', '2026-11-04T15:30:00'],
    ['it was made after 20:00 the day before', '2026-11-03T20:30:00', '2026-11-04T15:30:00'],
  ])('is none when %s', (_when, made, meeting) => {
    expect(answerDeadline(korea(made), korea(meeting))).toBeNull();
  });
});
