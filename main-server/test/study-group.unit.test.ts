/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type StudyInput } from '../src/assistant/dto/answer.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { checkBooking, PARTY_REFUSAL } from '../src/assistant/library/booking-rules.js';
import { CATALOGUE_FILE, type Catalogue, readCatalogue } from '../src/assistant/library/catalogue.js';
import { bookKeyOf, isLibraryKey } from '../src/assistant/library/library-card.js';
import { pickStudyTime } from '../src/assistant/library/study-pick.js';
import { groupRooms, studyRoomFor } from '../src/assistant/library/study-room.js';
import { type GroupPerson, NO_SHARED_DAY, studyGroupTime } from '../src/assistant/lookup/study-group.js';
import { studyGroupAnswer } from '../src/assistant/lookup/study-group-parts.js';
import { wordlessStudySentence } from '../src/assistant/lookup/study-plan-words.js';
import { item, KWANJEONG, walkingMinutes } from './study-fixtures.js';

// The study answer together (P10 ticket 07) over the 관정 catalogue, on Tuesday 2026-11-17 at 10:00 in Korea: a room
// can be booked up to Friday 2026-11-20, and waited for up to 14 days ahead. Walks to 관정관 are study-fixtures.ts's.

const NOW = new Date('2026-11-17T10:00:00+09:00');
const TOMORROW = '2026-11-18';
// Five days ahead, past the booking window.
const SUNDAY = '2026-11-22';

let catalogue: Catalogue;

beforeAll(async () => {
  catalogue = await readCatalogue(CATALOGUE_FILE);
});

const POINT = { placeId: KWANJEONG, label: '관정관(62-1동)', latitude: 37.4594, longitude: 126.9502 };

// Each person with a morning Class at 301동 that ends at 12:45: everyone can be in 관정관 from 12:59.
function morningClass(index: number, date = TOMORROW, items?: DayItem[]): GroupPerson {
  return {
    userId: index === 0 ? 'me' : `friend-${index}`,
    name: index === 0 ? '나' : `친구${index}`,
    me: index === 0,
    itemsByDate: { [date]: items ?? [item(date, '09:00', '12:45', '301')] },
    constraints: [],
  };
}

const peopleOf = (count: number, date = TOMORROW): GroupPerson[] =>
  Array.from({ length: count }, (_, index) => morningClass(index, date));

function inputOf(people: readonly GroupPerson[], given: Partial<StudyInput> = {}): StudyInput {
  return {
    kind: 'study',
    date: TOMORROW,
    what: 'any',
    people: people.map(({ userId, constraints }) => ({ userId, constraints })),
    together: true,
    window: { from: null, until: null },
    area: null,
    minutes: null,
    chosen: { seatSpaceId: null, roomSpaceId: null },
    ...given,
  };
}

function answerFor(people: GroupPerson[], given: Partial<StudyInput> = {}): AnswerReply {
  const input = inputOf(people, given);
  const time = studyGroupTime({
    input,
    dates: [input.date],
    now: NOW,
    catalogue,
    people,
    kwanjeongPlaceId: KWANJEONG,
    walkingMinutes,
  });
  return studyGroupAnswer({
    time,
    input,
    now: NOW,
    people,
    setOut: new Map(),
    others: [],
    kwanjeong: POINT,
    walkingMinutes,
    placePoint: (placeId) => ({ ...POINT, placeId, label: `${placeId}동` }),
    placeLabel: (placeId) => `${placeId}동`,
    hours: groupRooms(catalogue)[0]?.hours ?? null,
  });
}

const groupOf = (answer: AnswerReply): NonNullable<NonNullable<AnswerReply['plans'][number]['study']>['group']> => {
  const group = answer.plans[0]?.study?.group;
  if (group === undefined) {
    throw new Error('The answer has a group plan');
  }
  return group;
};

describe('Four people free tomorrow afternoon', () => {
  it('get the start pickStudyTime picks, in the room studyRoomFor picks, with a key the room request accepts', () => {
    const people = peopleOf(4);
    const answer = answerFor(people);
    const group = groupOf(answer);
    const [picked] = pickStudyTime({
      people: people.map(({ userId, itemsByDate }) => ({ id: userId, itemsByDate })),
      dates: [TOMORROW],
      hours: { open: '09:00', close: '23:00' },
      stepMinutes: 30,
      lengthMinutes: 180,
      kwanjeongPlaceId: KWANJEONG,
      walkingMinutes,
    });
    const room = studyRoomFor(catalogue, 4);
    const asked = bookKeyOf(group.key ?? '');

    expect(picked?.booking?.start).toBe('13:00');
    expect([answer.plans[0]?.startAt, answer.plans[0]?.endAt]).toEqual([
      `${TOMORROW}T13:00:00+09:00`,
      `${TOMORROW}T16:00:00+09:00`,
    ]);
    expect('space' in room ? room.space.id : null).toBe('4F-group-6');
    expect(group).toMatchObject({ room: { spaceId: '4F-group-6', floor: 4, name: '6인실' }, people: 4, moreNeeded: 0 });
    // The phone reads free rooms by the kind's library space; 4층's sector 14103 is told apart by its seatNos.
    expect(group.room.space).toMatchObject({ id: '4F-group-6', unit: 'room', roomNo: 141, sectorNo: 14103 });
    expect(group.room.space.seatNos).toHaveLength(24);
    expect(group.rooms.every(({ spaceId, space }) => space.id === spaceId && space.seatNos.length > 0)).toBe(true);
    expect(group.key).toBe(`book:4F-group-6:${TOMORROW}:1300:180`);
    expect(isLibraryKey(group.key ?? '')).toBe(true);
    const space = catalogue.byId.get('4F-group-6');
    expect(
      asked !== null &&
        space !== undefined &&
        'booking' in checkBooking(catalogue, space, { ...asked, people: 4 }, NOW),
    ).toBe(true);
    expect(answer.plans[0]?.study).toMatchObject({ spaces: [], book: null, liveSeats: 'kwanjeong' });
    expect(answer.plans[0]?.parts.map(({ arriveAt }) => arriveAt)).toEqual(
      people.map(() => `${TOMORROW}T13:00:00+09:00`),
    );
  });
});

describe('The rooms of four people', () => {
  it('list every kind, 2층 first, with why the others do not fit, and say one sentence', () => {
    const answer = answerFor(peopleOf(4));

    expect(groupOf(answer).rooms.map(({ spaceId, fits, reason }) => [spaceId, fits, reason])).toEqual([
      ['2F-group-6', true, null],
      ['2F-group-10', false, '7명부터'],
      ['4F-group-6', true, null],
      ['4F-group-8', false, '6명부터'],
      ['4F-group-10', false, '7명부터'],
    ]);
    expect(wordlessStudySentence(answer)).toBe('네 명이 모두 비는 내일 13:00에 관정 4층 6인실을 추천해요.');
  });
});

describe('The room and the time asked', () => {
  it('keep the kind the User chose while it fits them, and drop one that does not', () => {
    expect(
      groupOf(answerFor(peopleOf(4), { chosen: { seatSpaceId: null, roomSpaceId: '2F-group-6' } })).room.spaceId,
    ).toBe('2F-group-6');
    expect(
      groupOf(answerFor(peopleOf(4), { chosen: { seatSpaceId: null, roomSpaceId: '4F-group-8' } })).room.spaceId,
    ).toBe('4F-group-6');
  });

  it('take the window as bounds and its span as the length when none is asked', () => {
    const answer = answerFor(peopleOf(4), { window: { from: '15:00', until: '17:00' } });

    expect(groupOf(answer).key).toBe(`book:4F-group-6:${TOMORROW}:1500:120`);
  });
});

describe('Too few or too many', () => {
  it('gives 3 people the smallest room with one more needed and no key', () => {
    const answer = answerFor(peopleOf(3));

    expect(groupOf(answer)).toMatchObject({ room: { spaceId: '4F-group-6' }, people: 3, moreNeeded: 1, key: null });
    expect(wordlessStudySentence(answer)).toBe('그룹스터디룸은 네 명부터예요. 한 명만 더 부르면 돼요.');
  });

  it('gives 2 people two more needed, and the asker alone three, at the asker’s own free time', () => {
    const two = answerFor(peopleOf(2));
    const alone = answerFor(peopleOf(1));

    expect(groupOf(two)).toMatchObject({ people: 2, moreNeeded: 2, key: null });
    expect(wordlessStudySentence(two)).toBe('그룹스터디룸은 네 명부터예요. 두 명 더 부르면 돼요.');
    expect(groupOf(alone)).toMatchObject({ room: { spaceId: '4F-group-6' }, people: 1, moreNeeded: 3, key: null });
    expect(alone.plans[0]?.startAt).toBe(`${TOMORROW}T13:00:00+09:00`);
    expect(wordlessStudySentence(alone)).toBe('그룹스터디룸은 네 명부터예요. 세 명 더 부르면 돼요.');
  });

  it('refuses 9 people with the party’s limit, as no-fit', () => {
    const answer = answerFor(peopleOf(9));

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan).toMatchObject({ reason: 'no-fit', lines: [[{ text: PARTY_REFUSAL, strong: false }]] });
  });
});

describe('No common time', () => {
  it('is no-shared-time when nobody can be together for 30 minutes', () => {
    const people = [
      morningClass(0, TOMORROW, [item(TOMORROW, '09:00', '20:00', null)]),
      morningClass(1, TOMORROW, [item(TOMORROW, '12:00', '23:00', null)]),
      ...peopleOf(4).slice(2),
    ];

    const answer = answerFor(people);

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan).toMatchObject({
      reason: 'no-shared-time',
      lines: [[{ text: NO_SHARED_DAY, strong: false }]],
    });
    // Each lane over the rooms' hours on the day, 09:00 to 23:00 (P05 ticket 65).
    expect(answer.noPlan?.band).toMatchObject({
      startAt: `${TOMORROW}T09:00:00+09:00`,
      endAt: `${TOMORROW}T23:00:00+09:00`,
    });
    expect(answer.noPlan?.band?.lanes.slice(0, 2)).toEqual([
      {
        userId: 'me',
        name: '나',
        busy: [{ startAt: `${TOMORROW}T09:00:00+09:00`, endAt: `${TOMORROW}T20:00:00+09:00`, label: '수업' }],
      },
      {
        userId: 'friend-1',
        name: '친구1',
        busy: [{ startAt: `${TOMORROW}T12:00:00+09:00`, endAt: `${TOMORROW}T23:00:00+09:00`, label: '수업' }],
      },
    ]);
  });
});

describe('A day past the booking window', () => {
  it('waits for it: the key ends in :wait, and the answer says when it opens', () => {
    const answer = answerFor(peopleOf(4, SUNDAY), { date: SUNDAY });
    const group = groupOf(answer);

    expect(group.opens).toBe('11월 19일 09:00');
    expect(group.key).toBe(`book:4F-group-6:${SUNDAY}:1300:180:wait`);
    expect(bookKeyOf(group.key ?? '')).toMatchObject({ waitsForWindow: true });
    expect(wordlessStudySentence(answer)).toBe(
      '네 명이 모두 비는 11월 22일 13:00에 관정 4층 6인실을 추천해요. 11월 22일 방은 11월 19일 09:00부터 예약할 수 있어요.',
    );
  });
});

describe('A Friend who comes late', () => {
  it('joins at their notBefore, with their arrival noted, when the asker must leave by 16:30', () => {
    const [me, late, ...friends] = peopleOf(4);
    if (me === undefined || late === undefined) {
      throw new Error('Four people');
    }
    const people = [
      { ...me, constraints: [{ kind: 'leaveBy' as const, time: '16:30', source: 'asker' as const }] },
      { ...late, constraints: [{ kind: 'notBefore' as const, time: '14:00', source: 'asker' as const }] },
      ...friends,
    ];

    const [plan] = answerFor(people).plans;

    expect([plan?.startAt, plan?.endAt]).toEqual([`${TOMORROW}T13:30:00+09:00`, `${TOMORROW}T16:30:00+09:00`]);
    expect(plan?.parts[1]?.arriveAt).toBe(`${TOMORROW}T14:00:00+09:00`);
    expect(plan?.lines.at(-1)).toEqual([{ text: '친구1 14:00 도착', strong: false }]);
  });
});
