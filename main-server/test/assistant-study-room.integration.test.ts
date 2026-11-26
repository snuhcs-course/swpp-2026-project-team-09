/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { LIBRARY_RULES } from '../src/assistant/library/library-rules.js';
import { ask, postAssistantMessages } from './assistant.js';
import { LIBRARY } from './library.js';
import { ANSWER, companionsOf, type Group, SITE_NOTES, StudyStage } from './study-groups.js';

// The Assistant picks a study group's time in a 관정 group study room for an app that draws answers, on the stage's
// example week (test/study-groups.ts).

// Each group signs in four Users and befriends them over HTTP before it starts.
vi.setConfig({ testTimeout: 20_000, hookTimeout: 30_000 });

const stage = new StudyStage();

beforeAll(() => stage.start(inject('settings')));

afterAll(() => stage.stop());

const friendName = (name: string): string => `<data label="friend.name">${name}</data>`;

let people: Group;

beforeAll(async () => {
  people = await stage.group();
});

describe('A study with three Friends in the days a room can be booked', () => {
  it("shows one card for the design's Thursday, 15:30 for 180 minutes, with the companions and each one's note", async () => {
    const { cards } = await stage.study(people, {});

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      key: 'book:4F-group-6:2026-11-05:1530:180',
      action: 'book',
      date: '2026-11-05',
      start: '15:30',
      minutes: 180,
      companions: companionsOf(people),
      questId: null,
      notes: [
        '나 15:29 도착',
        '민수 17:01 도착',
        '지은 15:19 도착 · 16:56에 먼저 나서요',
        '서준 14:54 도착',
        ...SITE_NOTES,
      ],
    });
    expect(cards[0]?.space).toMatchObject({ id: '4F-group-6', unit: 'room', floor: 4 });
  });

  it('tells the model the pick, each stay, and the best time of the other days', async () => {
    const { result } = await stage.study(people, {});

    expect(result).toEqual({
      result: 'shown',
      summary:
        '2026-11-05(목) 15:30–18:30 관정 4층 6인실, 4명 예약을 아래에 띄웠어요. 예약하기를 눌러야 예약돼요. 카드에 로그인이 보이면 관정도서관에 먼저 로그인해요.',
      people: [
        { name: '나', arrival: '15:29', from: '15:30', until: '18:30', minutes: 180 },
        { name: friendName('민수'), arrival: '17:01', from: '17:01', until: '18:30', minutes: 89 },
        { name: friendName('지은'), arrival: '15:19', from: '15:30', until: '16:56', minutes: 86 },
        { name: friendName('서준'), arrival: '14:54', from: '15:30', until: '18:30', minutes: 180 },
      ],
      otherDays: [
        { date: '2026-11-03', start: '20:00', end: '23:00', shortestMinutes: 59 },
        { date: '2026-11-04', start: '20:00', end: '23:00', shortestMinutes: 59 },
        { date: '2026-11-06', start: '20:00', end: '23:00', shortestMinutes: 59 },
      ],
      noBookingOn: [],
    });
  });
});

describe('A study on a named day', () => {
  it('uses the day and the length as said: Friday for 120 minutes', async () => {
    const { cards, result } = await stage.study(people, { date: '2026-11-06', minutes: 120 });

    expect(cards[0]).toMatchObject({
      key: 'book:4F-group-6:2026-11-06:2100:120',
      date: '2026-11-06',
      start: '21:00',
      minutes: 120,
      notes: ['나 21:00부터', '민수 22:01 도착', '지은 21:00부터', '서준 21:00부터', ...SITE_NOTES],
    });
    expect(result).toMatchObject({ result: 'shown', otherDays: [], noBookingOn: [] });
  });

  it('says so when no time leaves nobody out: 민수 is in Class until 22:50 on Saturday', async () => {
    const { cards, result } = await stage.study(people, { date: '2026-11-07' });

    expect(result).toEqual({
      result: 'none',
      reason: '그 기간에는 모두가 30분 이상 함께 있을 수 있는 시간이 없어요.',
      days: ['2026-11-07'],
    });
    expect(cards).toEqual([]);
  });
});

const TODAYS_TOOLS = [
  'getMenus',
  'getShuttle',
  'showOnMap',
  'searchGlobalEvents',
  'showGlobalEvents',
  'searchRecruitingQuests',
  'showQuests',
  'resolveFriend',
  'resolvePlace',
  'resolveGlobalEvent',
  'proposeQuest',
  'getMyDay',
  'findFreeTimeEvents',
  'findFreeFriends',
  'findMealRestaurants',
  'showRestaurants',
  'findLibrarySpace',
  'findLibraryFreeSlots',
  'proposeLibraryBooking',
  'proposeLibraryCancel',
  'proposeLibraryReturn',
  'showLibrarySeats',
  'showMyLibraryBookings',
  'getTutorial',
];

const givenToolNames = (): string[] =>
  (stage.model.received()[0]?.tools ?? []).flatMap((tool) => (tool.type === 'function' ? [tool.name] : []));

describe('An app that does not draw answers', () => {
  it("is given today's tools and rules, without the study tool", async () => {
    stage.model.script({ text: '몇 시부터 몇 시까지 예약할까요?' });
    await postAssistantMessages(stage.app, people.me.accessToken, ask('민수랑 이번 주에 스터디'), LIBRARY).expect(200);

    expect(givenToolNames()).toEqual(TODAYS_TOOLS);
    expect(stage.model.system()).toContain(LIBRARY_RULES);
    expect(stage.model.system()).not.toContain('proposeStudyRoom');
  });

  it('is the only one without it: an app that draws answers is given the tool and its rule', async () => {
    stage.model.script({ text: '…' });
    await postAssistantMessages(stage.app, people.me.accessToken, ask('민수랑 이번 주에 스터디'), ANSWER).expect(200);

    expect(givenToolNames()).toContain('proposeStudyRoom');
    expect(stage.model.system()).toContain('then call proposeStudyRoom with their ids');
    expect(stage.model.system()).not.toContain(LIBRARY_RULES);
  });
});
