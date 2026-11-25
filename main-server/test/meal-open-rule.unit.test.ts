/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { MenuLineKind } from '../src/generated/prisma/client.js';
import { closes, closureNotices, servedLines } from '../src/menus/open-rule.js';

// The open rule (ADR 0011) on the lines the worker parses from its saved menu pages of 2026-10-01
// (worker-server/test/pages/), committed as they came out. The expected lists were read off those pages' cells.

const fixtureSchema = z.object({
  restaurants: z.array(
    z.object({
      name: z.string(),
      lines: z.array(z.object({ meal: z.string(), text: z.string(), kind: z.enum(MenuLineKind).nullable() })),
    }),
  ),
});

const { restaurants } = fixtureSchema.parse(
  JSON.parse(readFileSync(new URL('menu-lines-2026-10-01.json', import.meta.url), 'utf8')),
);

const OPEN_FOR_DINNER = [
  '학생회관식당',
  '자하연식당 2층',
  '예술계식당',
  '두레미담',
  '302동식당',
  '아워홈(901동)',
  '생협기숙사(919동)',
];

// Every collected one: 자하연식당 3층, 동원관식당, 3식당, 301동식당 and 수의대식당 serve lunch alone.
const OPEN_FOR_LUNCH = [...OPEN_FOR_DINNER, '자하연식당 3층', '동원관식당', '3식당', '301동식당', '수의대식당'];

function openFor(meal: string): string[] {
  return restaurants
    .filter(({ lines }) => servedLines(lines.filter((line) => line.meal === meal)).length > 0)
    .map(({ name }) => name);
}

describe('The open rule, on the pages of 2026-10-01', () => {
  it('finds every collected Restaurant open for lunch', () => {
    expect(openFor('lunch').toSorted()).toEqual(OPEN_FOR_LUNCH.toSorted());
  });

  it('leaves out of dinner a cell of only a note and the Restaurants with no lines', () => {
    expect(openFor('dinner').toSorted()).toEqual(OPEN_FOR_DINNER.toSorted());
    const third = restaurants.find(({ name }) => name === '자하연식당 3층');
    expect(third?.lines.filter(({ meal }) => meal === 'dinner')).toEqual([
      { meal: 'dinner', text: '※ 저녁 단체예약문의: 02-880-7889', kind: 'note' },
    ]);
  });

  it('takes a heading and a line of no kind as served, and drops the notes', () => {
    const lunch = restaurants.find(({ name }) => name === '302동식당')?.lines.filter(({ meal }) => meal === 'lunch');

    expect(servedLines(lunch ?? []).map(({ text }) => text)).toEqual([
      '<뷔페> 6,500원',
      '뼈없는감자탕',
      '미트볼굴소스조림',
      '참깨소스냉두부',
      '치커리유자청무침',
      '오렌지',
      '그린샐러드&오늘의차',
    ]);
  });

  it('closes a cell of a closure and hours, with no special case', () => {
    const cell = [
      { text: '개천절 휴무', kind: MenuLineKind.note },
      { text: '※ 운영시간 : 11:00~14:30', kind: MenuLineKind.note },
    ];

    expect(servedLines(cell)).toEqual([]);
  });
});

// P04 ticket 65: the closures the Co-op's and the dormitory's pages wrote in a meal's cell from March to November 2026,
// each the cell's one line, with the kind the worker gives it. Only those with 휴무 were notes before.
const CLOSURES: { text: string; kind: MenuLineKind | null }[] = [
  { text: '공대수시면접으로 인해 휴점합니다', kind: null },
  { text: '정전으로 휴점', kind: null },
  { text: '정전으로 인한 휴무', kind: MenuLineKind.note },
  { text: '대체공휴일', kind: null },
  { text: '대체굥휴일', kind: null },
  { text: '제헌절 공휴일', kind: null },
  { text: '광복절 대체공휴일', kind: null },
  { text: '공휴일 운영없음', kind: null },
  { text: '추석연휴 미운영', kind: null },
  { text: '대체공휴일휴무', kind: MenuLineKind.note },
  { text: '방학 중 휴무', kind: MenuLineKind.note },
];

describe('A closure written in the cell', () => {
  it.each(CLOSURES)('closes a cell of "$text" alone, with its words as the notice', (line) => {
    expect(closes(line)).toBe(true);
    expect(servedLines([line])).toEqual([]);
    expect(closureNotices([line])).toEqual([line.text]);
  });

  it('closes a cell of a closure and an hours note, and gives only the closure', () => {
    const cell = [
      { text: '공대수시면접으로 인해 휴점합니다', kind: null },
      { text: '※혼잡시간: 11:50~12:20', kind: MenuLineKind.note },
    ];

    expect(servedLines(cell)).toEqual([]);
    expect(closureNotices(cell)).toEqual(['공대수시면접으로 인해 휴점합니다']);
  });

  it('gives no notice for a cell whose notes close it without a closure', () => {
    expect(closureNotices([{ text: '※ 저녁 단체예약문의: 02-880-7889', kind: MenuLineKind.note }])).toEqual([]);
  });
});

describe('A cell that stays open', () => {
  it('keeps a closure beside dishes open: 301동식당 on 2026-10-15, its staff room closed beside its 식사 corner', () => {
    const cell = [
      { text: '<식사>', kind: MenuLineKind.heading },
      { text: '(뚝)참치김치찌개&꼬마돈가스: 6,500원', kind: MenuLineKind.dish },
      { text: '※ 운영시간 11:30~13:30', kind: MenuLineKind.note },
      { text: '<301동1층  교직원전용식당>', kind: MenuLineKind.heading },
      { text: '개교기념일 휴무', kind: MenuLineKind.note },
    ];

    expect(servedLines(cell).map(({ text }) => text)).toEqual([
      '<식사>',
      '(뚝)참치김치찌개&꼬마돈가스: 6,500원',
      '<301동1층  교직원전용식당>',
    ]);
    expect(closureNotices(cell)).toEqual([]);
  });

  it.each([
    '<뷔페 특성상 메뉴의 조기품절',
    '개교기념일- 구독샐러드 제공되지 않습니다.',
    '[방학기간 중 직화코너는  화요일만 운영합니다]',
    '*특식*',
  ])('takes a line of information, "%s", as served', (text) => {
    expect(closes({ text, kind: null })).toBe(false);
    expect(servedLines([{ text, kind: null }])).toHaveLength(1);
  });

  it('takes a closure that says something is still served as no closure', () => {
    expect(closes({ text: 'A코너 휴점, B코너 정상운영', kind: null })).toBe(false);
    expect(closes({ text: '방학 중 석식 미운영, 중식만 운영', kind: null })).toBe(false);
  });

  it('takes a line with a price as a dish, whatever its words', () => {
    expect(closes({ text: '휴일특선 비빔밥 : 6,000원', kind: MenuLineKind.dish })).toBe(false);
  });
});
