/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MealInput, PlanInput } from '@/api/assistant-types';
import type { MeetInput } from '@/api/meet-plan-types';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { meetInput, onlyFriendOf } from '@/features/assistant/meet-input';
import { peopleOf, windowOf, withBound, withOrigin, withoutPerson, withPerson } from '@/features/assistant/plan-input';

// "만나고 싶다" (P02 ticket 24): the conditions the button asks, and the card's changes to a meet's conditions, as to a
// meal's. Expected values: the ticket's input, the stored real answer of board a5, and board a6 (the band dropped at
// 14:00).

const ME = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';
const JIEUN = 'a4c0f6de-2b7e-4c57-9d3a-5e8f1b2c7d90';
const PLACE_24 = '055a68b1-3f09-5ea7-a98f-6f5febf1c6af';

// The conditions of the stored answer of a5: the User, then 민수, nothing fixed.
const A5: MeetInput = MEET_ANSWER.input;

// a5's conditions with 지은 added, to show a meet with two Friends.
const THREE: MeetInput = { ...A5, people: [...A5.people, { userId: JIEUN, constraints: [] }] };

describe('the conditions "만나고 싶다" asks', () => {
  // Partitions: the day of Korea's calendar at its last second and at its first; the asker first, then the Friend.
  it('are a meet of the asker and the Friend on the day in Korea, with nothing fixed', () => {
    expect(meetInput(ME, MINSU, new Date('2026-11-17T03:10:00Z'))).toEqual({
      kind: 'meet',
      date: '2026-11-17',
      people: [
        { userId: ME, constraints: [] },
        { userId: MINSU, constraints: [] },
      ],
      window: { from: null, until: null },
      placeId: null,
    });
  });

  it("take the day in Korea, which starts nine hours before UTC's", () => {
    expect(meetInput(ME, MINSU, new Date('2026-11-16T14:59:59Z')).date).toBe('2026-11-16');
    expect(meetInput(ME, MINSU, new Date('2026-11-16T15:00:00Z')).date).toBe('2026-11-17');
  });
});

describe('the only Friend of a meet', () => {
  // Partitions: a meet with one Friend, with two, with the asker alone; a meal with one Friend.
  it("is the Friend of a meet with one, whose ✕ goes back to the Friend's card", () => {
    expect(onlyFriendOf(A5)).toBe(MINSU);
  });

  it('is none for a meet with two Friends, where a ✕ takes one out', () => {
    expect(onlyFriendOf(THREE)).toBeNull();
  });

  it('is none for a meet of the asker alone', () => {
    expect(onlyFriendOf({ ...A5, people: [{ userId: ME, constraints: [] }] })).toBeNull();
  });

  it('is none for a meal, whose ✕ recalculates', () => {
    const meal: MealInput = { ...A5, kind: 'meal', meal: 'lunch' };

    expect(onlyFriendOf(meal)).toBeNull();
  });
});

describe("the card's changes to a meet's conditions", () => {
  // Partitions: the people read, a Friend taken out and the asker kept, a Friend added, a bound of the band set, and
  // the asker's start chosen; each keeps the kind and the rest of the conditions.
  it('read its people and its window', () => {
    const from14: PlanInput = { ...A5, window: { from: '14:00', until: null } };

    expect(peopleOf(A5)).toEqual(A5.people);
    expect(windowOf(from14)).toEqual({ from: '14:00', until: null });
  });

  it('take a Friend out and never the asker', () => {
    expect(withoutPerson(THREE, JIEUN)).toEqual(A5);
    expect(withoutPerson(A5, ME)).toEqual(A5);
  });

  it('add a Friend last with no constraints', () => {
    expect(withPerson(A5, JIEUN)).toEqual(THREE);
  });

  it('set the start of the band dropped at 14:00 (board a6)', () => {
    expect(withBound(A5, 'from', '14:00')).toEqual({ ...A5, window: { from: '14:00', until: null } });
  });

  it("give the asker a `from` the asker set, as a meal's origin chip does", () => {
    expect(withOrigin(A5, PLACE_24)).toEqual({
      ...A5,
      people: [
        { userId: ME, constraints: [{ kind: 'from', placeId: PLACE_24, source: 'asker' }] },
        { userId: MINSU, constraints: [] },
      ],
    });
  });
});
