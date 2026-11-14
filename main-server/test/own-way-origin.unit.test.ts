/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { at, item, walks } from './gathering-fixtures.js';
import { HAND, mealAtP, step, wayOf } from './own-way-fixtures.js';

// Where the invitee sets out from, an invitee with no Free Time, and what follows the gathering, on a small walking
// table with values chosen by hand. The meal is at P from 12:10, asked at 11:30.

const travel = walks(['O', 'P', 600], ['L', 'P', 300], ['P', 'N', 120]);
const SOMEWHERE = { latitude: 37.5, longitude: 127 };
const onCampus = { position: SOMEWHERE, placeId: 'L', onCampus: true };
const offCampus = { position: SOMEWHERE, placeId: null, onCampus: false };
const classBefore = (): DayItem[] => [item('11:00', '11:50', 'O')];

describe('An origin known from nothing', () => {
  it('is unknown, with no line of the way, and only the meal drawn', () => {
    expect(wayOf(mealAtP(), [], { ...HAND, travel })).toEqual({
      status: 'unknown',
      origin: null,
      leaveAt: null,
      walkMinutes: null,
      arriveAt: null,
      meeting: null,
      leaveBy: null,
      next: null,
      lines: [],
      scene: {
        people: [],
        places: [
          { place: { placeId: 'P', label: 'P관', latitude: 37.452, longitude: 126.95 }, role: 'pick', tag: null },
        ],
        routes: [],
        flags: [{ at: { latitude: 37.452, longitude: 126.95 }, text: '12:10 P관에서 식사', role: 'place' }],
      },
    });
  });

  it('still says when to leave for what follows', () => {
    expect(wayOf(mealAtP(), [item('13:00', '14:00', 'N')], { ...HAND, travel })).toMatchObject({
      status: 'unknown',
      leaveBy: '2026-11-17T12:58:00+09:00',
      lines: [[{ text: '13:00 수업이라 12:58엔 나서요.', strong: false }]],
    });
  });
});

describe("The request's location", () => {
  it('is where one free now sets out from, drawn at the exact position', () => {
    expect(wayOf(mealAtP(), [], { ...HAND, travel, location: onCampus })).toMatchObject({
      status: 'ok',
      origin: { place: { placeId: 'L' }, basis: 'location' },
      walkMinutes: 5,
      scene: { people: [{ at: SOMEWHERE, source: 'exact' }] },
    });
  });

  it('gives way to the Class before', () => {
    expect(wayOf(mealAtP(), classBefore(), { ...HAND, travel, location: onCampus })).toMatchObject({
      origin: { place: { placeId: 'O' }, basis: 'timetable' },
    });
  });

  it('off campus leaves the Class before as the origin', () => {
    expect(wayOf(mealAtP(), classBefore(), { ...HAND, travel, location: offCampus })).toMatchObject({
      status: 'ok',
      origin: { place: { placeId: 'O' }, basis: 'timetable' },
    });
  });

  it('off campus with no Class before tells that no way can be drawn', () => {
    expect(wayOf(mealAtP(), [], { ...HAND, travel, location: offCampus })).toMatchObject({
      status: 'off-campus',
      origin: null,
      lines: [[{ text: '캠퍼스 밖이라 길은 그리지 못해요.', strong: false }]],
      scene: { people: [], routes: [] },
    });
  });
});

describe('An item that ended a while ago', () => {
  it('is the origin when it ended 15 minutes ago', () => {
    expect(wayOf(mealAtP(), [item('10:00', '11:15', 'O')], { ...HAND, travel })).toMatchObject({
      origin: { place: { placeId: 'O' }, basis: 'timetable' },
    });
  });

  it('is not when it ended 16 minutes ago', () => {
    expect(wayOf(mealAtP(), [item('10:00', '11:14', 'O')], { ...HAND, travel })).toMatchObject({ status: 'unknown' });
  });
});

describe('No Free Time at the gathering', () => {
  it('says the invitee has something else then', () => {
    expect(wayOf(mealAtP(), [item('12:00', '13:00', 'O')], { ...HAND, travel: walks() })).toMatchObject({
      status: 'busy',
      origin: null,
      leaveAt: null,
      next: null,
      lines: [[{ text: '그 시간에는 다른 일정이 있어요.', strong: false }]],
      scene: { people: [], routes: [] },
    });
  });
});

describe('What follows', () => {
  it('is called 일정 when it is a Sub Quest', () => {
    const subQuest: DayItem = { ...item('13:00', '13:30', 'N'), isClass: false };

    expect(wayOf(mealAtP(), [...classBefore(), subQuest], { ...HAND, travel })).toMatchObject({
      leaveBy: '2026-11-17T12:58:00+09:00',
      lines: [
        [{ text: '12:00에 나서면 돼요.', strong: true }, {}],
        [{ text: '13:00 일정이라 12:58엔 나서요.', strong: false }],
      ],
    });
  });

  it('is reached at its start when it has no Place', () => {
    expect(wayOf(mealAtP(), [...classBefore(), item('13:00', '14:00', null)], { ...HAND, travel })).toMatchObject({
      leaveBy: '2026-11-17T13:00:00+09:00',
      next: { startAt: '2026-11-17T13:00:00+09:00', place: null },
    });
  });
});

describe('A gathering without an end', () => {
  it('still has a way', () => {
    const steps = [step('P관에서 식사', at('12:10'), null, 'P')];

    expect(wayOf(steps, classBefore(), { ...HAND, travel })).toMatchObject({
      status: 'ok',
      leaveAt: '2026-11-17T12:00:00+09:00',
    });
  });
});
