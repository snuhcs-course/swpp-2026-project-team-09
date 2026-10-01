import { type Meal, type MenuLine } from './dto/menus-collected.dto.js';

// Anything written like an amount of won, typos included: "6,000원", "4,500 원", "8,3000 원", "5.900원".
const AMOUNT = String.raw`\d[\d,.]*\s?원`;

// The line's price, when it gives exactly one and writes it without a typo.
function onePrice(text: string): number | null {
  const amounts = text.match(new RegExp(AMOUNT, 'gu')) ?? [];
  const digits = amounts.length === 1 ? amounts[0].replace(/\s?원$/u, '') : '';
  return /^(?:\d{1,3}(?:,\d{3})+|\d+)$/u.test(digits) ? Number(digits.replaceAll(',', '')) : null;
}

// What a line is, read from the line alone and only when it is sure.
function readMenuLine(text: string): Pick<MenuLine, 'kind' | 'price'> {
  // A notice, or a closure written in the cell: "※ 운영시간 : 11:00~14:30", "개천절 휴무".
  if (text.startsWith('※') || text.includes('휴무')) {
    return { kind: 'note', price: null };
  }
  // A corner or section alone on its line, with or without a set price: "<주문식 메뉴>", "<뷔페> 6,500원". A sentence
  // between the brackets is a notice: "< 위 메뉴외에도 다양한 메뉴가 준비되어 있습니다>".
  const heading = new RegExp(`^<([^<>]+)>\\s*(?:${AMOUNT})?$`, 'u').exec(text);
  if (heading !== null && !heading[1].trim().endsWith('다')) {
    return { kind: 'heading', price: onePrice(text) };
  }
  // A price after a colon: "눈꽃치즈닭갈비 : 6,000원", "<A코너>제육김치덮밥, 잡채 : 6,000원".
  if (new RegExp(`:\\s*${AMOUNT}`, 'u').test(text)) {
    return { kind: 'dish', price: onePrice(text) };
  }
  return { kind: null, price: null };
}

// The lines of a meal's cell, from the cell's text with a line break for each <br> of the page.
export function readMenuLines(meal: Meal, cellText: string): MenuLine[] {
  return cellText
    .split('\n')
    .map((line) => line.replaceAll('\u00A0', ' ').trim())
    .filter((line) => line !== '')
    .map((text) => {
      const { kind, price } = readMenuLine(text);
      return { meal, text, kind, price };
    });
}
