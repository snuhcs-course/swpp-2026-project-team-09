/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { friendAnswer, type FriendAnswer } from '../src/assistant/lookup/friend-lookup.js';
import { friendLookup } from '../src/assistant/lookup/friend.service.js';
import { type FriendView } from '../src/friends/dto/friend-view.dto.js';
import { classAt, id, placeOf, position, readCampus, TUESDAY } from './way-example.js';

// Where a Friend is, drawn on the map with what the asker's map shows of them (boards q5 to q7): 민수, with a Class in
// 302동 from 11:00 to 12:15 on Tuesday 2026-11-17, at each level the Friend view gives, on the seed's Places.

beforeAll(() => readCampus());

const ME = 'b0c2e3a4-0000-4000-8000-000000000001';
const MINSU = 'b0c2e3a4-0000-4000-8000-000000000002';

const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });
const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

// 30 m south of 제1공학관's point, outside its outline.
const BY_301 = { latitude: 37.44989, longitude: 126.95259 };

const minsu = (changes: Partial<FriendView> = {}): FriendView => ({
  id: MINSU,
  name: '민수',
  department: '컴퓨터공학부',
  friendId: 'MNS23456',
  friendsSince: '2026-09-01T12:00:00+09:00',
  level: 'timetable',
  position: null,
  placeId: null,
  ...changes,
});

const at302 = (): DayItem[] => [classAt(TUESDAY, '11:00', '12:15', '제2공학관')];

function answerAt(
  clock: string,
  friend: FriendView,
  classes = at302(),
  nearPlaceId: string | null = null,
): FriendAnswer {
  return friendAnswer({ now: onDay(TUESDAY, clock), friend, classes, nearPlaceId, placeOf });
}

const lookupAt = (...args: Parameters<typeof answerAt>): Lookup => answerAt(...args).lookup;

const NOTHING_DRAWN = { people: [], places: [], routes: [], flags: [] };

const TIMETABLE_BASIS = ['민수는 내게 시간표만 보여요', '민수에게 묻거나 알리지 않아요'];

describe('민수 at his exact location (board q5)', () => {
  const exact = minsu({ level: 'exact', position: { ...BY_301, measuredAt: '2026-11-17T12:20:00+09:00' } });

  it('is drawn where he is, tagged with the Place he is near, with his name as the chip and 만나고 싶다', () => {
    expect(lookupAt('12:20', exact, at302(), id('제1공학관'))).toEqual({
      kind: 'friend',
      chips: [{ kind: 'person', text: '민수', userId: MINSU }],
      lines: [[strong('민수'), plain('는 지금 301동 앞에 있어요')]],
      basis: ['민수는 내게 정확한 위치를 보여 줘요'],
      scene: {
        ...NOTHING_DRAWN,
        people: [{ userId: MINSU, name: '민수', me: false, at: BY_301, source: 'exact', tag: '민수 · 301동 앞' }],
      },
      band: null,
      actions: [{ kind: 'meet', userId: MINSU }],
    });
  });

  it('is tagged with the Place he is in, and says until when his Class goes on', () => {
    const inside = { ...exact, placeId: id('제2공학관') };

    const lookup = lookupAt('12:05', inside);

    expect(lookup.scene.people[0]?.tag).toBe('민수 · 302동');
    expect(lookup.lines).toEqual([[strong('민수'), plain('는 지금 302동에 있어요')], [plain('12:15까지 수업이에요')]]);
  });
});

describe('민수 at the building he is in (board q6)', () => {
  it('is drawn at the building with a plain face, and says until when his Class goes on', () => {
    const lookup = lookupAt('12:05', minsu({ level: 'building', placeId: id('제2공학관') }));

    expect(lookup.scene.people).toEqual([
      {
        userId: MINSU,
        name: '민수',
        me: false,
        at: position('제2공학관'),
        source: 'building',
        tag: '민수 · 지금 302동',
      },
    ]);
    expect(lookup.lines).toEqual([[strong('민수'), plain('는 지금 302동이에요')], [plain('12:15까지 수업이에요')]]);
    expect(lookup.basis).toEqual(['민수는 내게 지금 있는 건물까지 보여 줘요']);
  });
});

describe('민수 at the Timetable only (board q7)', () => {
  it("is drawn dashed at his Class's Place during the Class, without his position", () => {
    const lookup = lookupAt('12:05', minsu());

    expect(lookup.scene).toEqual({
      ...NOTHING_DRAWN,
      people: [
        {
          userId: MINSU,
          name: '민수',
          me: false,
          at: position('제2공학관'),
          source: 'timetable',
          tag: '민수 · 수업 중 12:15까지',
        },
      ],
    });
    expect(lookup.lines).toEqual([
      [plain('민수는 '), strong('12:15까지 302동 수업'), plain('이에요')],
      [plain('지금 위치는 보여 주지 않아요')],
    ]);
    expect(lookup.basis).toEqual(TIMETABLE_BASIS);
  });

  it("is drawn dashed at his Class's Place until 15 minutes after it ends", () => {
    const lookup = lookupAt('12:30', minsu());

    expect(lookup.scene.people).toMatchObject([
      { at: position('제2공학관'), source: 'timetable', tag: '민수 · 12:15 302동 수업 끝' },
    ]);
    expect(lookup.lines).toEqual([
      [plain('민수는 '), strong('12:15에 302동 수업'), plain('이 끝났어요')],
      [plain('지금 위치는 보여 주지 않아요')],
    ]);
  });
});

describe('민수 at the Timetable only, outside his Class and the 15 minutes after it', () => {
  // The Classes are read once the campus is read.
  it.each([
    [
      'after the 15 minutes, before his next Class',
      '12:31',
      (): DayItem[] => [...at302(), classAt(TUESDAY, '14:00', '15:15', '제2공학관')],
      '공강 · 14:00까지',
    ],
    [
      'before his first Class',
      '10:00',
      (): DayItem[] => [classAt(TUESDAY, '13:00', '14:15', '제2공학관')],
      '첫 수업 13:00',
    ],
    ['after his last Class', '12:31', at302, '오늘 수업 끝'],
    ['on a day without Classes', '12:05', (): DayItem[] => [], '오늘 수업 없음'],
    [
      'during a Class without a Place',
      '12:05',
      (): DayItem[] => [{ ...classAt(TUESDAY, '11:00', '12:15', '제2공학관'), placeId: null }],
      '수업 중 · 12:15까지',
    ],
  ])('is not drawn %s, and is one line of his Timetable label', (_, clock, classes, label) => {
    const lookup = lookupAt(clock, minsu(), classes());

    expect(lookup.scene).toEqual(NOTHING_DRAWN);
    expect(lookup.lines).toEqual([[strong('민수'), plain(` · ${label}`)]]);
    expect(lookup.basis).toEqual(TIMETABLE_BASIS);
  });

  it('is what a view at the building with no Place shows', () => {
    expect(lookupAt('12:05', minsu({ level: 'building' }))).toEqual(lookupAt('12:05', minsu()));
  });
});

describe('What the model is given of 민수', () => {
  it('is what the map shows: his name inside the delimiters, the level, and the Place it draws him at', () => {
    expect(answerAt('12:05', minsu({ level: 'building', placeId: id('제2공학관') })).words).toEqual({
      name: '<data label="friend.name">민수</data>',
      shows: 'the building they are in',
      place: '302동',
      classUntil: '12:15',
      classEnded: null,
      timetable: null,
    });
  });

  it('is his Timetable label when the map does not draw him', () => {
    expect(answerAt('12:31', minsu()).words).toEqual({
      name: '<data label="friend.name">민수</data>',
      shows: 'Timetable only',
      place: null,
      classUntil: null,
      classEnded: null,
      timetable: '오늘 수업 끝',
    });
  });
});

describe('A Friend read through the Friend view at the Timetable only', () => {
  // 민수 also holds a Sub Quest at 두산인문관 (8동), which is no part of his Timetable. Asked at 12:20, his Class ended 5
  // minutes ago while the Sub Quest goes on, so reading his Quests would draw him at 8동.
  const sources = {
    friends: { list: (): Promise<FriendView[]> => Promise.resolve([minsu()]) },
    days: {
      itemsOn: (): Promise<DayItem[]> =>
        Promise.resolve([
          ...at302(),
          { ...classAt(TUESDAY, '12:00', '13:00', '두산인문관'), name: '파티', isClass: false },
        ]),
    },
    places: { byId: placeOf, nearTo: (): null => null },
  };

  it('holds no position and no Place beyond his Timetable in the Lookup or what the model is given', async () => {
    const answer = await friendLookup(sources, ME, MINSU, onDay(TUESDAY, '12:20'));

    const text = JSON.stringify(answer);
    const { latitude, longitude } = position('두산인문관');
    expect(['8동', '두산인문관', String(latitude), String(longitude)].filter((word) => text.includes(word))).toEqual(
      [],
    );
    expect(answer?.lookup.scene.people).toMatchObject([{ at: position('제2공학관'), source: 'timetable' }]);
  });

  it('is none for a User who is not a Friend of the asker', async () => {
    expect(await friendLookup(sources, ME, 'b0c2e3a4-0000-4000-8000-000000000009', onDay(TUESDAY, '12:05'))).toBeNull();
  });
});
