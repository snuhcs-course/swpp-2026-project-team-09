/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { withBound, withOrigin, withoutPerson, withPerson } from '@/features/assistant/plan-input';

const ME = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';
const JIEUN = 'a4c0f6de-2b7e-4c57-9d3a-5e8f1b2c7d90';
const PLACE_301 = '1a242be2-05c6-5185-bcd1-0b78bc358f88';
const PLACE_63 = 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b';

// The conditions of the stored reply to "배고파, 민수랑 같이": the User, then 민수, nobody with a constraint.
const TWO = MEAL_ANSWER.input;

// The conditions of the stored reply asked again from 63동: the User's own `from`, as the main server sent it back.
const FROM_63: PlanInput = {
  kind: 'meal',
  date: '2026-11-17',
  meal: 'lunch',
  people: [
    { userId: ME, constraints: [{ kind: 'from', placeId: PLACE_63, source: 'asker' }] },
    { userId: MINSU, constraints: [] },
  ],
  window: { from: null, until: null },
  placeId: null,
};

describe('withoutPerson', () => {
  // Partitions: a Friend in the conditions (taken out), the asker (never taken out), someone not in them (nothing).
  it('takes a Friend out and keeps the rest of the conditions', () => {
    expect(withoutPerson(TWO, MINSU)).toEqual({ ...TWO, people: [{ userId: ME, constraints: [] }] });
  });

  it('never takes the asker out', () => {
    expect(withoutPerson(TWO, ME)).toEqual(TWO);
  });

  it('changes nothing for someone who is not in the conditions', () => {
    expect(withoutPerson(TWO, JIEUN)).toEqual(TWO);
  });

  it('leaves the conditions it was given as they were', () => {
    withoutPerson(TWO, MINSU);

    expect(TWO.people).toHaveLength(2);
  });
});

describe('withPerson', () => {
  // Partitions: someone not in the conditions (appended last, no constraints), someone already in (nothing).
  it('adds a Friend last with no constraints', () => {
    expect(withPerson(TWO, JIEUN)).toEqual({
      ...TWO,
      people: [
        { userId: ME, constraints: [] },
        { userId: MINSU, constraints: [] },
        { userId: JIEUN, constraints: [] },
      ],
    });
  });

  it('changes nothing for someone already in the conditions', () => {
    expect(withPerson(TWO, MINSU)).toEqual(TWO);
  });
});

describe('withBound', () => {
  // Partitions: the start set with the end kept, the end set with the start kept, a bound set over an earlier one.
  // The stored reply's window is open at both ends; one bound of it is changed here to show that it is kept.
  const FIXED_END: PlanInput = { ...TWO, window: { from: null, until: '13:10' } };
  const FIXED_START: PlanInput = { ...TWO, window: { from: '12:40', until: null } };

  it('sets the start and keeps the end', () => {
    expect(withBound(FIXED_END, 'from', '12:35')).toEqual({ ...TWO, window: { from: '12:35', until: '13:10' } });
  });

  it('sets the end and keeps the start', () => {
    expect(withBound(FIXED_START, 'until', '13:00')).toEqual({ ...TWO, window: { from: '12:40', until: '13:00' } });
  });

  it('sets a bound in place of an earlier one', () => {
    expect(withBound(FIXED_START, 'from', '12:20')).toEqual({ ...TWO, window: { from: '12:20', until: null } });
  });
});

// The conditions above with a `notBefore` the asker set added to the asker's, to show that it stays.
const LEAVING: PlanInput = {
  ...FROM_63,
  people: [
    {
      userId: ME,
      constraints: [
        { kind: 'notBefore', time: '12:00', source: 'asker' },
        { kind: 'from', placeId: PLACE_63, source: 'asker' },
      ],
    },
    { userId: MINSU, constraints: [] },
  ],
};

// The conditions above with a `from` 민수 set given to 민수, to show that only the asker's changes.
const FRIEND_FROM: PlanInput = {
  ...FROM_63,
  people: [
    { userId: ME, constraints: [{ kind: 'from', placeId: PLACE_63, source: 'asker' }] },
    { userId: MINSU, constraints: [{ kind: 'from', placeId: PLACE_63, source: 'person' }] },
  ],
};

describe('withOrigin', () => {
  // Partitions: an asker without a `from` (one added), an asker with one (replaced), the asker's other constraints
  // (kept), and a Friend's constraints (kept).
  it('gives the asker a `from` the asker set', () => {
    expect(withOrigin(TWO, PLACE_63)).toEqual(FROM_63);
  });

  it('replaces an earlier `from` of the asker', () => {
    expect(withOrigin(FROM_63, PLACE_301).people[0]).toEqual({
      userId: ME,
      constraints: [{ kind: 'from', placeId: PLACE_301, source: 'asker' }],
    });
  });

  it("keeps the asker's other constraints", () => {
    expect(withOrigin(LEAVING, PLACE_301).people[0]?.constraints).toEqual([
      { kind: 'notBefore', time: '12:00', source: 'asker' },
      { kind: 'from', placeId: PLACE_301, source: 'asker' },
    ]);
  });

  it("keeps a Friend's constraints", () => {
    expect(withOrigin(FRIEND_FROM, PLACE_301).people[1]).toEqual({
      userId: MINSU,
      constraints: [{ kind: 'from', placeId: PLACE_63, source: 'person' }],
    });
  });
});
