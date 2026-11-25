/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MenuLineKind } from '../generated/prisma/client.js';

interface CellLine {
  text: string;
  kind: MenuLineKind | null;
}

// A closure as the pages wrote it in a meal's cell from March to November 2026: "공대수시면접으로 인해 휴점합니다",
// "정전으로 휴점", "개천절 휴무", "대체공휴일" (once "대체굥휴일"), "제헌절 공휴일", "공휴일 운영없음", "추석연휴 미운영".
const CLOSES =
  /휴점|휴무|휴관|휴업|휴일|미운영|미영업|운영\s*(?:없|안\s*함|하지\s*않|중단)|영업\s*(?:없|안\s*함|하지\s*않|중단)|쉽니다/u;

// Words that say some of the meal is served after all: "직화코너는 화요일만 운영합니다", "B코너 정상운영".
const SERVES = /정상\s*(?:운영|영업)|만\s*(?:운영|영업)|운영합니다|영업합니다/u;

// Whether a line says the meal is not served, whatever kind the worker gave it. A line with a price is a dish, and a
// line that also says something is served is not a closure.
export function closes({ text, kind }: CellLine): boolean {
  return kind !== MenuLineKind.dish && CLOSES.test(text) && !SERVES.test(text);
}

// The lines of a meal's cell that are served: neither notes nor closures. A Restaurant is open for a meal when it has
// any (ADR 0011).
export function servedLines<Line extends CellLine>(cell: readonly Line[]): Line[] {
  return cell.filter((line) => line.kind !== MenuLineKind.note && !closes(line));
}

// The words of a meal's closure, as its cell writes them, when nothing in it is served: "공대수시면접으로 인해
// 휴점합니다". Empty for a meal served, and for one whose notes close it without saying so ("※ 저녁 단체예약문의").
export function closureNotices(cell: readonly CellLine[]): string[] {
  return servedLines(cell).length > 0 ? [] : cell.filter((line) => closes(line)).map(({ text }) => text);
}
