/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { menuNoneLookup } from '../src/assistant/lookup/menu-lookup.js';
import { MenuLineKind } from '../src/generated/prisma/client.js';
import { type MenuLineDto } from '../src/menus/dto/restaurant-menus.dto.js';

// A menu asked of a Restaurant that findMenu answers none still brings the Restaurant to the map (P04 ticket 59): "내일
// 301동 메뉴 뭐야?" left the earlier answer's 302동식당 on the map. Asked on Tuesday 2026-11-24 at 15:00 of Wednesday's
// lunch; the lines and the Place are made by hand.

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

// Partitions by why it is none: the menu not posted yet; only notes (not served); no free time to eat there.
describe('menuNoneLookup', () => {
  it('says the menu is not posted yet', () => {
    const lookup = menuNoneLookup({ ...ARGS, lines: [] }, 'no-menu', PLACE);

    expect(lookup).toMatchObject({
      kind: 'place',
      lines: [[{ text: '301동식당', strong: true }], [{ text: '내일 점심 메뉴 아직 안 올라옴', strong: false }]],
      basis: [],
      band: null,
      actions: [{ kind: 'guide', to: { placeId: PLACE.id, label: '301동식당', ...POINT } }],
      fact: true,
    });
    expect(lookup.scene).toEqual(sceneSaying('내일 점심 메뉴 아직 안 올라옴'));
  });

  it('says the meal is not served that day', () => {
    const lookup = menuNoneLookup({ ...ARGS, lines: [note('※ 개교기념일 휴무')] }, 'closed', PLACE);

    expect(lookup.scene).toEqual(sceneSaying('내일 점심은 안 해요'));
  });

  it('names the dishes when the User has no time to eat there, with their prices as its basis', () => {
    const lines = [dish('제육볶음 : 6,000원', '제육볶음', 6000), dish('돈까스 : 6,500원', '돈까스', 6500)];

    const lookup = menuNoneLookup({ ...ARGS, lines }, 'no-time', PLACE);

    expect(lookup.scene).toEqual(sceneSaying('제육볶음 · 돈까스'));
    expect(lookup.basis).toEqual(['제육볶음 6,000원 · 돈까스 6,500원']);
  });
});
