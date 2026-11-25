/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { cellReasonOf, missingLookup, missingWords, planReasonOf } from '../src/assistant/gathering/missing-place.js';
import { MenuLineKind } from '../src/generated/prisma/client.js';
import { type MenuLineDto } from '../src/menus/dto/restaurant-menus.dto.js';

// P04 ticket 67: why a Restaurant is not among the places of the meal on screen, as its lines for the meal and the
// planner's answer for the same conditions tell it. Expected values: the reasons as the User reads them, the drop
// reasons as the planner gives them ("13분밖에 못 있어요").

const NOTICE = '공대수시면접으로 인해 휴점합니다';
const line = (text: string, kind: MenuLineKind | null = null): MenuLineDto => ({ text, kind, name: null, price: null });
const DISH: MenuLineDto = { text: '제육볶음 : 6,000원', kind: MenuLineKind.dish, name: '제육볶음', price: 6000 };
const POINT = { placeId: 'p-302', label: '302동식당', latitude: 37.4, longitude: 126.9 };

function answerWith(plans: string[], dropped: [string, string][]): Parameters<typeof planReasonOf>[1] {
  return {
    plans: plans.map((label) => ({ place: { ...POINT, label } })),
    dropped: dropped.map(([label, reason]) => ({ place: { ...POINT, label }, reason })),
  };
}

// Partitions: no lines; notes only; a closing notice alone; a closing notice beside a dish; a dish.
describe('what the Restaurant’s lines for the meal tell', () => {
  it.each<[string, MenuLineDto[], ReturnType<typeof cellReasonOf>]>([
    ['no lines collected', [], { why: 'no-menu' }],
    ['notes only', [line('※ 운영시간 변경', MenuLineKind.note)], { why: 'no-menu' }],
    ['a closing notice alone', [line(NOTICE)], { why: 'closed', notices: [NOTICE] }],
    ['a closing notice beside a dish', [line(NOTICE), DISH], null],
    ['a dish', [DISH], null],
  ])('%s', (_case, cell, expected) => {
    expect(cellReasonOf(cell)).toEqual(expected);
  });
});

// Partitions: one of the places; dropped with the planner's reason; neither.
describe('what the planner’s answer tells of a Restaurant that serves the meal', () => {
  it('says it is one of the places', () => {
    expect(planReasonOf('302동식당', answerWith(['302동식당'], []))).toEqual({ why: 'listed' });
  });

  it('gives the reason it was dropped for', () => {
    const answer = answerWith(['301동식당'], [['두레미담', '13분밖에 못 있어요']]);

    expect(planReasonOf('두레미담', answer)).toEqual({ why: 'time', reason: '13분밖에 못 있어요' });
  });

  it('says it cannot be reached, eaten at, and left in time when the planner names it nowhere', () => {
    expect(planReasonOf('감골식당', answerWith(['301동식당'], [['두레미담', '13분밖에 못 있어요']]))).toEqual({
      why: 'no-fit',
    });
  });
});

describe('the reason in the User’s words', () => {
  it.each<[Parameters<typeof missingWords>[0], string]>([
    [{ why: 'closed', notices: [NOTICE] }, NOTICE],
    [{ why: 'no-menu' }, '메뉴가 올라오지 않았어요'],
    [{ why: 'time', reason: '김민수는 13분밖에 못 있어요' }, '김민수는 13분밖에 못 있어요'],
    [{ why: 'no-fit' }, '시간 안에 다녀올 수 없어요'],
    [{ why: 'listed' }, '목록에 있어요'],
  ])('%j', (reason, words) => {
    expect(missingWords(reason)).toBe(words);
  });

  it('labels the Restaurant brought to the map with it, as a fact the next reply lets go', () => {
    const lookup = missingLookup(
      '302동식당',
      { why: 'closed', notices: [NOTICE] },
      { id: 'p-302', latitude: 37.4, longitude: 126.9 },
    );

    expect(lookup.lines).toEqual([[{ text: '302동식당', strong: true }], [{ text: NOTICE, strong: false }]]);
    expect(lookup.scene.places.map(({ place, role }) => [place.label, role])).toEqual([['302동식당', 'pick']]);
    expect(lookup.scene.flags.map(({ text }) => text)).toEqual([`302동식당 · ${NOTICE}`]);
    expect(lookup.fact).toBe(true);
  });
});
