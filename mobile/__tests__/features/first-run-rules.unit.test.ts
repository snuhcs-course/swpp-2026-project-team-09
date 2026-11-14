/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions: a User outside the first run, one with all three cards waiting and nothing yet, each card answered or
// skipped, each thing the User already has, what is not known yet, a main server that keeps no interests, and the
// interests card opened again from the line over the input. Expected values: P05 ticket 09.

import {
  answeredElsewhere,
  asksForInterests,
  cardToShow,
  type FirstRunCard,
  type FirstRunFacts,
} from '@/features/first-run/rules';

const ALL: FirstRunCard[] = ['timetable', 'interests', 'friend'];
const NOTHING: FirstRunFacts = { classes: 0, interests: 0, friends: 0 };
const EVERYTHING: FirstRunFacts = { classes: 2, interests: 1, friends: 3 };

describe('cardToShow', () => {
  it('shows no card to a User outside the first run', () => {
    expect(cardToShow(null, NOTHING)).toBeNull();
  });

  it('shows the Timetable first, then interests, then one Friend', () => {
    expect(cardToShow(ALL, NOTHING)).toBe('timetable');
    expect(cardToShow(['interests', 'friend'], NOTHING)).toBe('interests');
    expect(cardToShow(['friend'], NOTHING)).toBe('friend');
    expect(cardToShow([], NOTHING)).toBeNull();
  });

  it('passes over a card that asks for what the User has', () => {
    expect(cardToShow(ALL, { ...NOTHING, classes: 1 })).toBe('interests');
    expect(cardToShow(ALL, { ...NOTHING, classes: 1, interests: 2 })).toBe('friend');
    expect(cardToShow(ALL, EVERYTHING)).toBeNull();
  });

  it('passes over the interests card for a main server that keeps no interests', () => {
    expect(cardToShow(['interests', 'friend'], { ...NOTHING, interests: null })).toBe('friend');
  });

  it('waits while what the next card asks about is not known', () => {
    expect(cardToShow(ALL, { ...NOTHING, classes: undefined })).toBeNull();
    expect(cardToShow(['interests', 'friend'], { ...NOTHING, interests: undefined })).toBeNull();
    expect(cardToShow(['friend'], { ...NOTHING, classes: undefined, friends: 0 })).toBe('friend');
  });

  it('shows the interests card again when asked, while the User has no interest', () => {
    expect(cardToShow([], NOTHING, true)).toBe('interests');
    expect(cardToShow(['friend'], NOTHING, true)).toBe('interests');
    expect(cardToShow([], { ...NOTHING, interests: 1 }, true)).toBeNull();
  });
});

describe('answeredElsewhere', () => {
  it('counts a waiting card as answered once the User has what it asks for', () => {
    expect(answeredElsewhere(ALL, { classes: 1, interests: 0, friends: 2 })).toEqual(['timetable', 'friend']);
  });

  it('counts nothing while it is not known, or for a main server that keeps no interests', () => {
    expect(answeredElsewhere(ALL, { classes: undefined, interests: null, friends: undefined })).toEqual([]);
  });

  it('counts nothing outside the first run, nor a card that waits no more', () => {
    expect(answeredElsewhere(null, EVERYTHING)).toEqual([]);
    expect(answeredElsewhere(['friend'], EVERYTHING)).toEqual(['friend']);
  });
});

describe('asksForInterests', () => {
  it('asks a User of the first run who has no interest', () => {
    expect(asksForInterests([], NOTHING)).toBe(true);
  });

  it('does not ask a User with an interest, outside the first run, or while it is not known', () => {
    expect(asksForInterests([], { ...NOTHING, interests: 1 })).toBe(false);
    expect(asksForInterests(null, NOTHING)).toBe(false);
    expect(asksForInterests([], { ...NOTHING, interests: undefined })).toBe(false);
    expect(asksForInterests([], { ...NOTHING, interests: null })).toBe(false);
  });
});
