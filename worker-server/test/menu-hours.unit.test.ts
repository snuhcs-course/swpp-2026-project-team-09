/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type MenuLine } from '../src/menu/dto/menus-collected.dto.js';
import { readHoursLine, readMealHours } from '../src/menu/menu-hours.js';

function note(meal: MenuLine['meal'], text: string): MenuLine {
  return { meal, text, kind: 'note', name: null, price: null };
}

function heading(meal: MenuLine['meal'], text: string): MenuLine {
  return { meal, text, kind: 'heading', name: null, price: null };
}

describe('An hours line', () => {
  // Each form the saved pages (test/pages/) and the stored lines of 2026-10-01 write.
  it.each([
    ['※ 운영시간 : 11:00~14:30', '11:00', '14:30'],
    ['※운영시간 : 08:00~09:30', '08:00', '09:30'],
    ['※운영시간: 11:30~13:30', '11:30', '13:30'],
    ['※ 운영시간 11:30~13:30', '11:30', '13:30'],
    ['※ 운영시간 : 11:30 ~ 14:00', '11:30', '14:00'],
    ['※ 운영시간 :  08:30~16:00', '08:30', '16:00'],
    ['※ 운영시간 : 11 : 00 ~ 18 : 30', '11:00', '18:30'],
    ['※ 운영 시간 9 : 30 ~ 19 : 00', '09:30', '19:00'],
  ])('reads %j', (text, opensAt, closesAt) => {
    expect(readHoursLine(text)).toEqual({ opensAt, closesAt });
  });

  it.each([
    // Other times of the pages.
    '※ 혼잡시간 : 11:50~12:20',
    '※주문식 라스트 오더 : 19:15',
    '※ 교직원이용시간 : 11:30~12:15',
    '※ 학생 및 대학원생 이용시간  12:15~13:30',
    // An opening without a closing, and hours with conditions.
    '※ 08:20~준비수량 소진시까지',
    '※ 운영시간 : 학기중 평일, 주말 09 ~ 20시 / 라스트오더 19시:40분',
    // Not hours.
    '개천절 휴무',
    '눈꽃치즈닭갈비 : 6,000원',
    // Forms the pages have not written: no rule reads them yet.
    '※ 운영시간 : 11:00-14:30',
    '※ 운영시간 : 11시~14시30분',
    // A time past the day, and a closing before the opening.
    '※ 운영시간 : 11:00~24:30',
    '※ 운영시간 : 14:30~11:00',
  ])('leaves %j alone', (text) => {
    expect(readHoursLine(text)).toBeNull();
  });
});

describe("A meal's hours", () => {
  it("are read from the one hours line of the meal's cell, with the line", () => {
    const lines = [
      { meal: 'lunch', text: '눈꽃치즈닭갈비 : 6,000원', kind: 'dish', name: '눈꽃치즈닭갈비', price: 6000 },
      note('lunch', '※ 운영시간 : 11:00~14:30'),
      note('lunch', '※ 혼잡시간 : 11:50~12:20'),
      note('dinner', '※운영시간: 17:00~18:30'),
    ] satisfies MenuLine[];

    expect(readMealHours(lines)).toEqual([
      { meal: 'lunch', opensAt: '11:00', closesAt: '14:30', line: '※ 운영시간 : 11:00~14:30' },
      { meal: 'dinner', opensAt: '17:00', closesAt: '18:30', line: '※운영시간: 17:00~18:30' },
    ]);
  });

  it('are none when the cell gives hours for each corner', () => {
    // 예술계식당's lunch on 2026-10-01: A코너 and B코너 close at different times.
    const lines = [note('lunch', '※ 운영시간 : 11:30 ~ 14:00'), note('lunch', '※ 운영시간 : 11:30 ~ 13:00')];

    expect(readMealHours(lines)).toEqual([]);
  });

  it("are the meal counter's when the cell also gives take-out hours", () => {
    // 301동식당's lunch on 2026-10-01 (test/pages/), a cell of four sections.
    const lines = [
      heading('lunch', '<식사>'),
      note('lunch', '※ 운영시간 11:30~13:30'),
      heading('lunch', '<TAKE-OUT>'),
      note('lunch', '※ 운영시간 : 10:30~16:00'),
      heading('lunch', '<301동1층  교직원전용식당>'),
      note('lunch', '※ 교직원이용시간 : 11:30~12:15'),
      heading('lunch', '<TAKE-OUT 카페 301동>'),
      note('lunch', '※ 운영시간 :  08:30~16:00'),
    ];

    expect(readMealHours(lines)).toEqual([
      { meal: 'lunch', opensAt: '11:30', closesAt: '13:30', line: '※ 운영시간 11:30~13:30' },
    ]);
  });

  it('are none when the cell has no hours line it reads', () => {
    expect(readMealHours([note('breakfast', '※ 08:20~준비수량 소진시까지'), note('lunch', '개천절 휴무')])).toEqual([]);
  });
});
