/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { MenuLineKind } from '../src/generated/prisma/client.js';
import { servedLines } from '../src/menus/open-rule.js';

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
