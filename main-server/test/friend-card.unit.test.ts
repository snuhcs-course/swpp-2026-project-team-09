/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type CardFact, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { friendTap, type FriendTapArgs } from '../src/assistant/lookup/friend-lookup.js';
import { friendTapLookup } from '../src/assistant/lookup/friend.service.js';
import { SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { type FriendView } from '../src/friends/dto/friend-view.dto.js';
import { readSeedTravel, shownMinutes } from '../src/travel/travel.js';
import { classAt, id, placeOf, position, readCampus, TUESDAY } from './way-example.js';

// A pressed Friend's card (wireframe row 6, boards a4, a13, and a10) on Tuesday 2026-11-17 at 12:10, the User setting
// out from 301동, on the seed's Places and walking table: 김민수 in 302동 at the building level, 김지은 at 두산인문관 at
// the exact level, and 박서준 at the Timetable only, each read through the Friend view.

let walkMinutes: FriendTapArgs['walkMinutes'] = () => 0;

beforeAll(async () => {
  await readCampus();
  const travel = await readSeedTravel(SEED_DIRECTORY);
  walkMinutes = (from, to): number => shownMinutes(travel.walkingSeconds(from, to));
});

const ME = 'b0c2e3a4-0000-4000-8000-000000000001';
const FRIEND = 'b0c2e3a4-0000-4000-8000-000000000002';

const FROM_301 = (): FriendTapArgs['start'] => ({ placeId: id('제1공학관'), label: '301동' });

const view = (name: string, changes: Partial<FriendView> = {}): FriendView => ({
  id: FRIEND,
  name,
  department: '컴퓨터공학부',
  level: 'timetable',
  position: null,
  placeId: null,
  ...changes,
});

function tapped(
  friend: FriendView,
  classes: DayItem[],
  { clock = '12:10', start = FROM_301() }: { clock?: string; start?: FriendTapArgs['start'] } = {},
): Lookup {
  return friendTap({ now: onDay(TUESDAY, clock), friend, classes, nearPlaceId: null, placeOf, start, walkMinutes });
}

const plain = (icon: CardFact['icon'], text: string): CardFact => ({ icon, text, strong: false, userId: null });

const strong = (icon: CardFact['icon'], text: string): CardFact => ({ icon, text, strong: true, userId: null });

const FROM_CHIP = [{ kind: 'origin', text: '301동에서', userId: null }];

describe('김민수 at the building he is in (board a4)', () => {
  it('is his full name, the level, his Timetable label, the building, and the walk from me', () => {
    const lookup = tapped(view('김민수', { level: 'building', placeId: id('제2공학관') }), [
      classAt(TUESDAY, '11:00', '12:15', '제2공학관'),
    ]);

    expect(lookup.card).toEqual({
      title: '김민수',
      subtitle: '지금 있는 건물까지 보여요',
      facts: [strong('clock', '수업 중 · 12:15까지'), plain('pin', '302동'), plain('route', '나에게서 걸어서 3분')],
      note: null,
    });
    expect(lookup.chips).toEqual(FROM_CHIP);
    expect(lookup.kind).toBe('friend');
    expect(lookup.actions).toEqual([{ kind: 'meet', userId: FRIEND }]);
  });
});

describe('김지은 at her exact location (board a13)', () => {
  it('has the lines of the building level, under the exact level', () => {
    const exact = view('김지은', {
      level: 'exact',
      position: { ...position('두산인문관'), measuredAt: '2026-11-17T12:09:00+09:00' },
      placeId: id('두산인문관'),
    });

    const lookup = tapped(exact, [classAt(TUESDAY, '11:00', '12:15', '두산인문관')]);

    expect(lookup.card).toEqual({
      title: '김지은',
      subtitle: '정확한 위치까지 보여요',
      facts: [strong('clock', '수업 중 · 12:15까지'), plain('pin', '8동'), plain('route', '나에게서 걸어서 16분')],
      note: null,
    });
  });

  it('leaves the walk and the chip out when where I am is not known', () => {
    const lookup = tapped(view('김민수', { level: 'building', placeId: id('제2공학관') }), [], { start: null });

    expect(lookup.card?.facts).toEqual([strong('clock', '오늘 수업 없음'), plain('pin', '302동')]);
    expect(lookup.chips).toEqual([]);
  });

  it('leaves the walk and the chip out when I am in the same building', () => {
    const start = { placeId: id('제2공학관'), label: '302동' };

    const lookup = tapped(view('김민수', { level: 'building', placeId: id('제2공학관') }), [], { start });

    expect(lookup.card?.facts.map(({ icon }) => icon)).toEqual(['clock', 'pin']);
    expect(lookup.chips).toEqual([]);
  });
});

// Where the asker sets out from, read only when it is needed.
const from301 = (): Promise<Pick<FriendTapArgs, 'start' | 'walkMinutes'>> =>
  Promise.resolve({ start: FROM_301(), walkMinutes });

// 박서준's Class in 43-1동 until 12:50.
const in431 = (): DayItem[] => [classAt(TUESDAY, '11:00', '12:50', '이공계멀티미디어강의동')];

describe('박서준 at the Timetable only (board a10)', () => {
  it('is his Class by the Timetable and that his position is not shown, with no walk', () => {
    const lookup = tapped(view('박서준'), in431());

    expect(lookup.card).toEqual({
      title: '박서준',
      subtitle: '시간표만 보여요',
      facts: [strong('clock', '시간표로는 12:50까지 43-1동 수업이에요'), plain('lock', '지금 위치는 보여 주지 않아요')],
      note: null,
    });
    expect(lookup.chips).toEqual([]);
  });

  it('names his next Class during this one', () => {
    const lookup = tapped(view('박서준'), [...in431(), classAt(TUESDAY, '14:00', '15:15', '제2공학관')]);

    expect(lookup.card?.facts).toEqual([
      strong('clock', '시간표로는 12:50까지 43-1동 수업이에요'),
      plain('calendar', '다음 수업 14:00 · 302동'),
      plain('lock', '지금 위치는 보여 주지 않아요'),
    ]);
  });

  it('says where his Class ended, until 15 minutes after it, with his label', () => {
    const lookup = tapped(view('박서준'), [...in431(), classAt(TUESDAY, '14:00', '15:15', '제2공학관')], {
      clock: '13:05',
    });

    expect(lookup.card?.facts).toEqual([
      strong('clock', '12:50에 43-1동 수업이 끝났어요 · 공강 14:00까지'),
      plain('calendar', '다음 수업 14:00 · 302동'),
      plain('lock', '지금 위치는 보여 주지 않아요'),
    ]);
  });

  it('is his Timetable label after the 15 minutes', () => {
    const lookup = tapped(view('박서준'), [...in431(), classAt(TUESDAY, '14:00', '15:15', '제2공학관')], {
      clock: '13:06',
    });

    expect(lookup.card?.facts.slice(0, 2)).toEqual([
      strong('clock', '공강 · 14:00까지'),
      plain('calendar', '다음 수업 14:00 · 302동'),
    ]);
  });

  it('is what a view at the exact level without a position shows', () => {
    expect(tapped(view('박서준', { level: 'exact' }), in431()).card).toEqual(tapped(view('박서준'), in431()).card);
  });
});

describe('A Friend pressed while the Friend view shows the Timetable only', () => {
  // 김민수 also holds a Sub Quest at 두산인문관 (8동), which is no part of his Timetable, and his kept position would
  // be there. Pressed at 12:20, his Class ended 5 minutes ago while the Sub Quest goes on.
  const sources = {
    friends: { list: (): Promise<FriendView[]> => Promise.resolve([view('김민수')]) },
    days: {
      itemsOn: (): Promise<DayItem[]> =>
        Promise.resolve([
          classAt(TUESDAY, '11:00', '12:15', '제2공학관'),
          { ...classAt(TUESDAY, '12:00', '13:00', '두산인문관'), name: '파티', isClass: false },
        ]),
    },
    places: { byId: placeOf, nearTo: (): null => null },
  };

  it('holds no position and no Place beyond his Timetable in the card', async () => {
    const lookup = await friendTapLookup(sources, ME, FRIEND, onDay(TUESDAY, '12:20'), from301);

    const text = JSON.stringify(lookup);
    const { latitude, longitude } = position('두산인문관');
    expect(['8동', '두산인문관', String(latitude), String(longitude)].filter((word) => text.includes(word))).toEqual(
      [],
    );
    expect(lookup?.card?.facts[0]).toEqual(strong('clock', '12:15에 302동 수업이 끝났어요 · 오늘 수업 끝'));
  });

  it('is none for a User who is not a Friend of the asker, read before anything of where the asker is', async () => {
    const stranger = 'b0c2e3a4-0000-4000-8000-000000000009';
    const from = vi.fn(from301);

    expect(await friendTapLookup(sources, ME, stranger, onDay(TUESDAY, '12:20'), from)).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});
