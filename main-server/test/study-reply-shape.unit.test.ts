/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { contextLines } from '../src/assistant/context-lines.js';
import { type AnswerReply, NO_CONTEXT, recalculationSchema } from '../src/assistant/dto/answer.dto.js';
import { CLIENT_CAPABILITIES } from '../src/assistant/feature.js';
import { type Catalogue, CATALOGUE_FILE, readCatalogue } from '../src/assistant/library/catalogue.js';
import { cardSpace } from '../src/assistant/library/library-card.js';
import { STUDY_ANSWER } from './fixtures/study-answer.js';
import {
  STUDY_GROUP_GATHERING,
  STUDY_GROUP_MORE_NEEDED,
  STUDY_GROUP_READY,
  STUDY_GROUP_TO_SEND,
} from './fixtures/study-group-answers.js';

// The study answer's shape (P10 ticket 02): its input as a recalculation and a request's context take it, the whole
// reply the app session builds its mock from, and the line the model reads with it on screen. Expected values: the
// spec's shape.

const { input } = STUDY_ANSWER;
const sent = (changed: object): boolean => recalculationSchema.safeParse({ input: { ...input, ...changed } }).success;

const person = (index: number): object => ({
  userId: `1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4b${String(index).padStart(2, '0')}`,
  constraints: [],
});

// Partitions: the input as it is, near (an area), with Friends (8 people, a party's limit), a length and a choice;
// an unknown what, 9 people, an area turned over, a length out of range, a missing field, an unknown key.
describe("A study plan's input", () => {
  it('is taken as it is, with an area, with Friends up to 8 people, a length and a choice', () => {
    expect(sent({})).toBe(true);
    expect(sent({ area: { south: 37.45, west: 126.94, north: 37.47, east: 126.96 } })).toBe(true);
    expect(sent({ people: Array.from({ length: 8 }, (_, index) => person(index)) })).toBe(true);
    expect(sent({ minutes: 120, chosen: { seatSpaceId: '7F-7A-zone2', roomSpaceId: '4F-group-6' } })).toBe(true);
  });

  it('is refused with an unknown what, 9 people, an area turned over, a bad length, or a key it lacks or does not have', () => {
    const { chosen: _chosen, ...withoutChosen } = input.kind === 'study' ? input : { chosen: null };

    expect(sent({ what: 'cafe' })).toBe(false);
    expect(sent({ people: Array.from({ length: 9 }, (_, index) => person(index)) })).toBe(false);
    expect(sent({ area: { south: 37.47, west: 126.94, north: 37.45, east: 126.96 } })).toBe(false);
    expect(sent({ minutes: 0 })).toBe(false);
    expect(recalculationSchema.safeParse({ input: withoutChosen }).success).toBe(false);
    expect(sent({ meal: 'lunch' })).toBe(false);
  });

  it('says whether it is studying together, a field it cannot lack (P10 ticket 07)', () => {
    const { together: _together, ...withoutTogether } = input.kind === 'study' ? input : { together: null };

    expect(sent({ together: true })).toBe(true);
    expect(sent({ together: 'yes' })).toBe(false);
    expect(recalculationSchema.safeParse({ input: withoutTogether }).success).toBe(false);
  });
});

const requestState = (answer: AnswerReply): unknown => answer.plans[0]?.study?.group?.request?.status;

describe('The study answer with Friends', () => {
  const groups = [STUDY_GROUP_TO_SEND, STUDY_GROUP_GATHERING, STUDY_GROUP_READY, STUDY_GROUP_MORE_NEEDED];

  it('is taken back as an input, and has one plan, 관정관, with its group room and no seat to book', () => {
    for (const answer of groups) {
      expect(recalculationSchema.safeParse({ input: answer.input }).success).toBe(true);
      expect(answer.plans.map(({ id, study }) => [id, study?.book, study?.group?.room.spaceId])).toEqual([
        ['관정관', null, '4F-group-6'],
      ]);
    }
  });

  it('can be sent with four people, and not with three, who need one more', () => {
    const [ready] = STUDY_GROUP_TO_SEND.plans;
    const [short] = STUDY_GROUP_MORE_NEEDED.plans;

    expect(ready?.study?.group).toMatchObject({ people: 4, moreNeeded: 0, key: 'book:4F-group-6:2026-11-05:1500:120' });
    expect(short?.study?.group).toMatchObject({ people: 3, moreNeeded: 1, key: null });
    expect(short?.study?.group?.rooms.every(({ fits }) => !fits)).toBe(true);
  });

  it('shows the request once sent: gathering, then ready', () => {
    expect(groups.map((answer) => requestState(answer))).toEqual([undefined, 'gathering', 'ready', undefined]);
  });
});

let catalogue: Catalogue;

beforeAll(async () => {
  catalogue = await readCatalogue(CATALOGUE_FILE);
});

describe("The group fixtures' room kinds", () => {
  it("carry each kind's library space as the catalogue gives it, for the phone to read free rooms", () => {
    const kinds = [STUDY_GROUP_TO_SEND, STUDY_GROUP_MORE_NEEDED].flatMap(({ plans }) =>
      plans.flatMap(({ study }) => (study?.group === undefined ? [] : [study.group.room, ...study.group.rooms])),
    );

    expect(kinds.length).toBeGreaterThan(0);
    for (const { spaceId, space } of kinds) {
      const listed = catalogue.byId.get(spaceId);
      expect(space).toEqual(listed === undefined ? null : cardSpace(listed, listed.seatNos));
    }
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

    expect(booked.map(({ id, study }) => [id, study?.book?.spaceId, study?.liveSeats])).toEqual([
      ['관정관', '7F-7A-zone2', 'kwanjeong'],
    ]);
    // With the book card the app opens in the plan (P10 ticket 21).
    expect(booked[0]?.study?.book?.card).toMatchObject({ action: 'book', key: 'book:7F-7A-zone2:2026-11-04:1930:210' });
  });

  it('lists the known-open buildings before those whose hours are not known, and never calls one closed', () => {
    const states = plans.map(({ study }) => study?.spaces[0]?.open);

    expect(states).toEqual(['open', 'open', 'open', 'unknown']);
    expect(STUDY_ANSWER.closed?.map(({ notices }) => notices)).toEqual([['오늘 18:00에 닫았어요']]);
  });
});

describe('The capability and the line on screen', () => {
  it('is study-plan alone, and study-group together', () => {
    expect(CLIENT_CAPABILITIES).toContain('study-plan');
    expect(CLIENT_CAPABILITIES).toContain('study-group');
  });

  it('gives no seat to book for the plan together, and says it is together', () => {
    const line = contextLines({ ...NO_CONTEXT, conditions: STUDY_GROUP_MORE_NEEDED.input, planId: '관정관' })[0];

    expect(line).toContain('"together":true');
    expect(line).not.toContain('"book"');
  });

  it('gives the study plan on screen with the places numbered', () => {
    const planIds = STUDY_ANSWER.plans.map(({ id }) => id);

    expect(contextLines({ ...NO_CONTEXT, conditions: input, planId: '법학도서관', planIds })).toEqual([
      `[Plan on screen: {"plan":"법학도서관","kind":"study","date":"2026-11-04","what":"any","friendIds":[],"from":null,"until":null,"minutes":null,"near":false,"numbered":${JSON.stringify(planIds)}}]`,
    ]);
  });
});
