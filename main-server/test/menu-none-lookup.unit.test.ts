/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { menuNoneLookup } from '../src/assistant/lookup/menu-lookup.js';
import { MenuLineKind } from '../src/generated/prisma/client.js';
import { type MenuLineDto } from '../src/menus/dto/restaurant-menus.dto.js';

// A menu asked of a Restaurant that findMenu answers none still brings the Restaurant to the map (P04 ticket 59): "내일
// 301동 메뉴 뭐야?" left the earlier answer's 302동식당 on the map. The app shows its menu with why in its head, in place
// of the chips, the lines, and the basis (P04 ticket 72). Asked on Tuesday 2026-11-24 at 15:00 of Wednesday's lunch;
// the lines and the Place are made by hand.

const NOW = new Date('2026-11-24T15:00:00+09:00');
const WEDNESDAY = '2026-11-25';
const PLACE = {
  id: 'a1b2c3d4-0000-4000-8000-000000000301',
  number: '301',
  name: '제1공학관',
  latitude: 37.45,
  longitude: 126.95,
};
const POINT = { latitude: 37.45, longitude: 126.95 };
const ARGS = { key: '301동식당', date: WEDNESDAY, meal: 'lunch' as const, now: NOW };

const dish = (text: string, name: string, price: number): MenuLineDto => ({
  text,
  kind: MenuLineKind.dish,
  name,
  price,
});
const note = (text: string): MenuLineDto => ({ text, kind: MenuLineKind.note, name: null, price: null });

const sceneSaying = (state: string): unknown => ({
  people: [],
  places: [{ place: { placeId: PLACE.id, label: '301동식당', ...POINT }, role: 'pick', tag: '301동식당' }],
  routes: [],
  flags: [{ at: POINT, text: `301동식당 · ${state}`, role: 'place' }],
});

// Partitions by why it is none: the menu not posted yet; posted, but without the meal (P04 ticket 60); closed by its
// menu's notice, or only notes (not served); no free time to eat there, the meal under way or over; and today against
// another day (P04 ticket 60: the day is named but today's).
describe('menuNoneLookup', () => {
  it('shows the menu with why in its head, and no chips, no lines, no basis', () => {
    const lookup = menuNoneLookup({ ...ARGS, lines: [] }, 'no-menu', PLACE);

    expect(lookup).toMatchObject({
      kind: 'place',
      chips: [],
      lines: [],
      basis: [],
      band: null,
      actions: [{ kind: 'guide', to: { placeId: PLACE.id, label: '301동식당', ...POINT } }],
      fact: true,
      menuView: { restaurant: '301동식당', date: WEDNESDAY, meal: 'lunch', why: '메뉴가 아직 안 올라왔어요' },
    });
    expect(lookup.scene).toEqual(sceneSaying('내일(수) 점심 메뉴 아직 안 올라옴'));
  });

  it('says there is no menu of the meal when the day was posted without it', () => {
    const lookup = menuNoneLookup({ ...ARGS, lines: [] }, 'no-meal', PLACE);

    expect(lookup.scene).toEqual(sceneSaying('내일(수) 점심 메뉴 없음'));
    expect(lookup.menuView?.why).toBe('점심 메뉴가 없어요');
  });

  it('says today as 오늘', () => {
    const today = { ...ARGS, date: '2026-11-24', meal: 'dinner' as const, lines: [] };

    expect(menuNoneLookup(today, 'no-meal', PLACE).scene.flags[0]?.text).toBe('301동식당 · 오늘 저녁 메뉴 없음');
    expect(menuNoneLookup(today, 'no-menu', PLACE).scene.flags[0]?.text).toBe(
      '301동식당 · 오늘 저녁 메뉴 아직 안 올라옴',
    );
  });

  it('says the meal is not served that day when only notes close it', () => {
    const lookup = menuNoneLookup({ ...ARGS, lines: [note('※ 개교기념일 휴무')] }, 'closed', PLACE);

    expect(lookup.scene).toEqual(sceneSaying('내일(수) 점심은 안 해요'));
    expect(lookup.menuView?.why).toBe('※ 개교기념일 휴무');
  });
});

// Partitions: no time to eat there with the meal still under way, and the meal over.
describe('menuNoneLookup with no time to eat there', () => {
  it('says the time does not fit when the User has no time to eat there, naming the dishes on the map', () => {
    const lines = [dish('제육볶음 : 6,000원', '제육볶음', 6000), dish('돈까스 : 6,500원', '돈까스', 6500)];

    const lookup = menuNoneLookup({ ...ARGS, lines }, 'no-time', PLACE);

    expect(lookup.scene).toEqual(sceneSaying('내일(수) 점심 · 제육볶음 · 돈까스'));
    expect(lookup.menuView?.why).toBe('시간이 안 맞아요');
  });

  it('says the meal is over when its time has passed', () => {
    const lines = [dish('제육볶음 : 6,000원', '제육볶음', 6000)];
    const late = { ...ARGS, date: '2026-11-24', now: new Date('2026-11-24T15:00:00+09:00'), lines };

    expect(menuNoneLookup(late, 'no-time', PLACE).menuView?.why).toBe('점심 시간이 지났어요');
  });
});

// P04 ticket 65: a closure the worker gives no kind.
describe('menuNoneLookup of a meal its menu closes', () => {
  it("says a closure's own words, as the meal list's 쉬는 곳 does, and that the meal is not served for notes that say none", () => {
    const closed = {
      ...ARGS,
      lines: [{ text: '공대수시면접으로 인해 휴점합니다', kind: null, name: null, price: null }],
    };
    const notesOnly = { ...ARGS, lines: [note('※ 저녁 단체예약문의: 02-880-7889')] };

    expect(menuNoneLookup(closed, 'closed', PLACE).menuView?.why).toBe('공대수시면접으로 인해 휴점합니다');
    expect(menuNoneLookup(notesOnly, 'closed', PLACE).menuView?.why).toBe('내일(수) 점심은 안 해요');
  });
});
