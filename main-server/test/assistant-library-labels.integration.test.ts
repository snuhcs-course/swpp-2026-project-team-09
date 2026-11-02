/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { inject } from 'vitest';
import { befriend, type TestUser } from './friends.js';
import { find, libraryCards, LibraryStage, resolving } from './library.js';
import { addClass } from './timetable.js';

// Condition refusals played through the exact tools the P6 labels require (eval/p6), so that the labels and the
// tools cannot drift apart: the refusal comes from proposeLibraryBooking, and the reply passes it on with no card.

const stage = new LibraryStage();
let user: TestUser;
let friendIds: string[];

beforeAll(async () => {
  await stage.start(inject('settings'));
  user = await stage.user('라벨예약자');
  const friends = await Promise.all(['라벨민수', '라벨지은'].map((name) => stage.user(name)));
  await Promise.all(friends.map((friend) => befriend(stage.app, user, friend)));
  friendIds = friends.map(({ id }) => id);
});

afterAll(() => stage.stop());

// The tools the model called, in order, as the last call received their results.
function toolsCalled(): string[] {
  const prompt = stage.model.received().at(-1)?.prompt ?? [];
  return prompt.flatMap((message) =>
    message.role === 'tool'
      ? message.content.flatMap((part) => (part.type === 'tool-result' ? [part.toolName] : []))
      : [],
  );
}

describe('"내일 아침 9시부터 7A 열람실 2 구역 3시간 예약해줘"', () => {
  it('is refused by proposeLibraryBooking for the day, and the reply passes it on with no card', async () => {
    const reply = '열람실은 당일만 예약할 수 있어요. 오늘로 예약할까요?';
    const response = await stage.send(user, [
      find(['7F-7A-zone2'], '7A 열람실 2 구역'),
      {
        tool: 'proposeLibraryBooking',
        input: { spaceId: '7F-7A-zone2', date: '2026-11-05', start: '09:00', minutes: 180 },
      },
      { text: reply },
    ]);

    expect(toolsCalled()).toEqual(['findLibrarySpace', 'proposeLibraryBooking']);
    expect(stage.model.toolResults()[1]).toEqual({
      result: 'refused',
      refusals: [{ field: 'date', reason: '열람실은 당일만 예약할 수 있어요', bound: '2026-11-04' }],
    });
    expect(response.body).toMatchObject({ text: reply });
    expect(libraryCards(response.body)).toEqual([]);
  });
});

describe('Three people for a 4층 6인실', () => {
  it('are refused by proposeLibraryBooking below its minimum of 4, and the reply passes it on with no card', async () => {
    const reply = '그룹스터디룸 6인실은 4명 이상이어야 예약할 수 있어요. 1명 더 필요해요.';
    const response = await stage.send(user, [
      resolving('라벨민수'),
      resolving('라벨지은'),
      find(['4F-group-6'], '4층 6인실'),
      {
        tool: 'proposeLibraryBooking',
        input: { spaceId: '4F-group-6', date: '2026-11-05', start: '15:00', minutes: 60, friendIds },
      },
      { text: reply },
    ]);

    expect(toolsCalled()).toEqual(['resolveFriend', 'resolveFriend', 'findLibrarySpace', 'proposeLibraryBooking']);
    expect(stage.model.toolResults()[3]).toMatchObject({
      result: 'refused',
      refusals: [{ field: 'friendIds', bound: { min: 4, more: 1 } }],
    });
    expect(response.body).toMatchObject({ text: reply });
    expect(libraryCards(response.body)).toEqual([]);
  });
});

describe('"오늘 내 공강에 7A 열람실 2 구역 자리 잡아줘"', () => {
  it('finds the space, then the free slots, and asks which slot with no card', async () => {
    const student = await stage.user('라벨공강');
    const times = [
      { weekday: 'wednesday', startTime: '10:00', endTime: '12:00', placeId: null, room: '101호' },
      { weekday: 'wednesday', startTime: '13:30', endTime: '14:30', placeId: null, room: '101호' },
      { weekday: 'wednesday', startTime: '16:00', endTime: '18:00', placeId: null, room: '101호' },
    ];
    await addClass(stage.app, student.accessToken, { courseName: '라벨수업', times });
    const reply = '12:00, 14:30, 18:00부터 비어 있어요. 몇 시로 할까요?';
    const response = await stage.send(student, [
      find(['7F-7A-zone2'], '7A 열람실 2 구역'),
      { tool: 'findLibraryFreeSlots', input: { spaceId: '7F-7A-zone2', date: '2026-11-04' } },
      { text: reply },
    ]);

    expect(toolsCalled()).toEqual(['findLibrarySpace', 'findLibraryFreeSlots']);
    expect(stage.model.toolResults()[1]).toMatchObject({
      result: 'found',
      slots: [
        { start: '12:00', end: '13:30' },
        { start: '14:30', end: '16:00' },
        { start: '18:00', end: '23:00' },
      ],
    });
    expect(response.body).toMatchObject({ text: reply });
    expect(libraryCards(response.body)).toEqual([]);
  });
});

describe('"7A 열람실 2 구역 지금 자리 있어?"', () => {
  it('finds the space, then shows one seats card for it', async () => {
    const response = await stage.send(user, [
      find(['7F-7A-zone2'], '7A 열람실 2 구역'),
      { tool: 'showLibrarySeats', input: { spaceId: '7F-7A-zone2' } },
      { text: '아래 카드에서 빈 자리를 확인해 보세요.' },
    ]);

    expect(toolsCalled()).toEqual(['findLibrarySpace', 'showLibrarySeats']);
    expect(libraryCards(response.body)).toMatchObject([
      { key: 'seats:7F-7A-zone2:2026-11-04', action: 'seats', space: { id: '7F-7A-zone2' } },
    ]);
  });
});
