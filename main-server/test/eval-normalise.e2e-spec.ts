/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import {
  argsMatch,
  cardsOf,
  normaliseArgs,
  outcomeOf,
  proposalMatches,
  proposalOf,
  roleOf,
} from '../eval/normalise.ts';
import { FRIEND, names, OTHER_FRIEND, PLACE } from './eval-traces.ts';

// The benchmark's normalisers (P19 ticket 02): each tool's arguments and results read one way, so that a format change
// in a tool is one edit there. No app, no model.

const EVENT = '0b0e3f5e-0000-4000-8000-000000000004';
const withEvent = (id: string): string | undefined => (id === EVENT ? '가을축제' : names(id));

describe("A tool's arguments", () => {
  it('read dates as YYYY-MM-DD in Korea, whatever form the model wrote them in', () => {
    expect(normaliseArgs('getMenus', { date: '2026-10-21T23:30:00+09:00', meal: 'lunch' }, names)).toEqual({
      date: '2026-10-21',
      meal: 'lunch',
    });
    expect(normaliseArgs('getMenus', { date: '2026-10-21T15:30:00Z' }, names)).toEqual({ date: '2026-10-22' });
  });

  it("read a start as the day and HH:MM in Korea, and the resolved ids as the seeds' names", () => {
    const args = {
      title: ' 점심 ',
      startsAt: '2026-10-22T03:00:00.000Z',
      placeId: PLACE,
      inviteeIds: [OTHER_FRIEND, FRIEND],
    };

    expect(normaliseArgs('proposeQuest', { ...args, board: '식사' }, names)).toEqual({
      title: '점심',
      startsAt: '2026-10-22 12:00',
      place: '학생회관',
      invitees: ['김민수', '이민수'],
      board: 'meal',
    });
  });

  it("trim a resolver's words and read Boards by name", () => {
    expect(normaliseArgs('resolveFriend', { name: '  민수 ' }, names)).toEqual({ name: '민수' });
    expect(normaliseArgs('searchRecruitingQuests', { board: '취미', globalEventId: EVENT }, withEvent)).toEqual({
      board: 'hobby',
      globalEvent: '가을축제',
    });
  });

  it('keep an id no seed has, and the arguments of a tool the table does not know', () => {
    expect(normaliseArgs('showQuests', { ids: ['unknown-id'] }, names)).toEqual({ ids: ['unknown-id'] });
    expect(normaliseArgs('newTool', { a: 1 }, names)).toEqual({ a: 1 });
  });
});

describe('Expected arguments', () => {
  it('match when written by seed name and in any form of time, fields not expected left out', () => {
    const called = normaliseArgs('proposeQuest', { startsAt: '2026-10-22T19:00:00+09:00', placeId: PLACE }, names);

    expect(argsMatch('proposeQuest', { startsAt: '2026-10-22T19:00+09:00', place: '학생회관' }, called, names)).toBe(
      true,
    );
    expect(argsMatch('proposeQuest', { startsAt: '2026-10-22 07:00' }, called, names)).toBe(false);
  });

  it('match a list of words when it holds every expected one', () => {
    const search = normaliseArgs('searchGlobalEvents', { from: '2026-10-21', words: ['공연', '콘서트'] }, names);

    expect(argsMatch('searchGlobalEvents', { words: [' 공연'] }, search, names)).toBe(true);
    expect(argsMatch('searchGlobalEvents', { words: ['전시'] }, search, names)).toBe(false);
  });

  it('match a list of ids only when it is the same set', () => {
    const proposed = normaliseArgs('proposeQuest', { inviteeIds: [FRIEND, OTHER_FRIEND] }, names);

    expect(argsMatch('proposeQuest', { invitees: ['김민수', '이민수'] }, proposed, names)).toBe(true);
    expect(argsMatch('proposeQuest', { invitees: ['이민수'] }, proposed, names)).toBe(false);
  });
});

describe("A tool's result", () => {
  it('is read as what the tool answered, an error, or unfinished', () => {
    expect(outcomeOf({ id: '1', name: 'getMenus', input: {}, result: { result: 'found' } })).toBe('found');
    expect(outcomeOf({ id: '1', name: 'resolveFriend', input: {}, result: { result: 'several' } })).toBe('several');
    expect(outcomeOf({ id: '1', name: 'showQuests', input: {}, error: 'Error: refused' })).toBe('error');
    expect(outcomeOf({ id: '1', name: 'getMenus', input: {} })).toBe('unfinished');
  });
});

describe("A tool's role", () => {
  it.each([
    ['getMenus', 'lookup'],
    ['getShuttle', 'lookup'],
    ['searchGlobalEvents', 'lookup'],
    ['searchRecruitingQuests', 'lookup'],
    ['showOnMap', 'presenter'],
    ['showQuests', 'presenter'],
    ['showGlobalEvents', 'presenter'],
    ['resolveFriend', 'resolver'],
    ['resolvePlace', 'resolver'],
    ['resolveGlobalEvent', 'resolver'],
    ['proposeQuest', 'proposer'],
    ['newTool', null],
  ])('of %s is %s', (tool, role) => {
    expect(roleOf(tool)).toBe(role);
  });
});

describe("The reply's cards", () => {
  it('are read by seed name, else by title', () => {
    const cards = [
      { kind: 'globalEvent', globalEvent: { id: EVENT, title: '가을 축제' } },
      { kind: 'quest', quest: { id: 'not-seeded', title: '농구 파티' } },
    ];

    expect(cardsOf(cards, withEvent)).toEqual([
      { kind: 'globalEvent', name: '가을축제' },
      { kind: 'quest', name: '농구 파티' },
    ]);
  });
});

const closed = {
  title: '점심',
  description: '',
  joinPolicy: 'closed',
  board: null,
  capacity: 2,
  startsAt: '2026-10-22T12:00:00+09:00',
  place: { id: PLACE, name: '학생회관' },
  globalEvent: null,
  invitees: [{ id: FRIEND, name: '이민수' }],
};

describe("The reply's Proposal", () => {
  it('is read by its values, its start in Korea and its names by seed', () => {
    expect(proposalOf(closed, names)).toEqual({
      joinPolicy: 'closed',
      board: null,
      capacity: 2,
      startsAt: '2026-10-22 12:00',
      place: '학생회관',
      globalEvent: null,
      invitees: ['이민수'],
    });
    expect(proposalOf(null, names)).toBeNull();
  });

  it('matches on the expected fields only, the start in any form and the Board by name', () => {
    const open = { ...closed, joinPolicy: 'open', board: 'meal', capacity: 4, startsAt: '2026-10-22T19:00:00+09:00' };
    const proposal = proposalOf({ ...open, place: null, globalEvent: { id: EVENT, title: '가을 축제' } }, withEvent);

    expect(
      proposalMatches({ startsAt: '2026-10-22T10:00:00Z', board: '식사', globalEvent: '가을축제' }, proposal),
    ).toEqual([]);
    expect(proposalMatches({ capacity: 3, place: '학생회관' }, proposal)).toEqual(['capacity', 'place']);
    expect(proposalMatches({ capacity: 3 }, null)).toEqual(['capacity']);
  });
});
