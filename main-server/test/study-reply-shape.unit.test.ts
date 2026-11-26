/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { contextLines } from '../src/assistant/context-lines.js';
import { NO_CONTEXT, recalculationSchema } from '../src/assistant/dto/answer.dto.js';
import { CLIENT_CAPABILITIES } from '../src/assistant/feature.js';
import { STUDY_ANSWER } from './fixtures/study-answer.js';

// The study answer's shape (P10 ticket 02): its input as a recalculation and a request's context take it, the whole
// reply the app session builds its mock from, and the line the model reads with it on screen. Expected values: the
// spec's shape.

const { input } = STUDY_ANSWER;
const sent = (changed: object): boolean => recalculationSchema.safeParse({ input: { ...input, ...changed } }).success;

// Partitions: the input as it is, near (an area), an unknown what, two people, an area turned over, an unknown key.
describe("A study plan's input", () => {
  it('is taken as it is and with an area', () => {
    expect(sent({})).toBe(true);
    expect(sent({ area: { south: 37.45, west: 126.94, north: 37.47, east: 126.96 } })).toBe(true);
  });

  it('is refused with an unknown what, two people, an area turned over, or a key it does not have', () => {
    const [asker] = input.kind === 'study' ? input.people : [];

    expect(sent({ what: 'cafe' })).toBe(false);
    expect(sent({ people: [asker, { userId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', constraints: [] }] })).toBe(false);
    expect(sent({ area: { south: 37.47, west: 126.94, north: 37.45, east: 126.96 } })).toBe(false);
    expect(sent({ meal: 'lunch' })).toBe(false);
  });
});

describe('The whole study answer', () => {
  const { plans } = STUDY_ANSWER;

  it('is choosable, with one plan per building and every plan a study plan', () => {
    expect(STUDY_ANSWER.choosable).toBe(true);
    expect(new Set(plans.map(({ id }) => id)).size).toBe(plans.length);
    expect(plans.every(({ study }) => study !== undefined)).toBe(true);
  });

  it('books at 관정관 only, whose seats the phone reads', () => {
    const booked = plans.filter(({ study }) => study?.book !== null);

    expect(booked.map(({ id, study }) => [id, study?.book, study?.liveSeats])).toEqual([
      ['관정관', { spaceId: '7F-7A-zone2' }, 'kwanjeong'],
    ]);
  });

  it('lists the known-open buildings before those whose hours are not known, and never calls one closed', () => {
    const states = plans.map(({ study }) => study?.spaces[0]?.open);

    expect(states).toEqual(['open', 'open', 'open', 'unknown']);
    expect(STUDY_ANSWER.closed?.map(({ notices }) => notices)).toEqual([['오늘 18:00에 닫았어요']]);
  });
});

describe('The capability and the line on screen', () => {
  it('is study-plan', () => {
    expect(CLIENT_CAPABILITIES).toContain('study-plan');
  });

  it('gives the study plan on screen with the places numbered', () => {
    const planIds = STUDY_ANSWER.plans.map(({ id }) => id);

    expect(contextLines({ ...NO_CONTEXT, conditions: input, planId: '법학도서관', planIds })).toEqual([
      `[Plan on screen: {"plan":"법학도서관","kind":"study","date":"2026-11-04","what":"any","from":null,"until":null,"near":false,"numbered":${JSON.stringify(planIds)}}]`,
    ]);
  });
});
