/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLabel, answerLabelBox } from '@/design-system';
import { MEAL_PICK_MAX, PICK_TIME_CEILING, pickTimeMax, SUB_MAX } from '@/design-system/map-answer-box';

function label(
  side: AnswerLabel['side'],
  tone: AnswerLabel['tone'],
  title: string,
  more: Partial<AnswerLabel> = {},
): AnswerLabel {
  return { side, tone, title, line: null, number: null, ...more };
}

// The worked widths: the padding of 8 at each side, a number's badge of 16 and its gap of 4, the pick's border of 2 at
// each side, and the words at the advance widths of Pretendard rounded up (a Hangul syllable 0.87 of the font's size,
// a space, "·", or ":" 0.29, "W" and "→" 1.0, a digit 0.67), at 12 points, or 14 for the pick's title; the sum rounded
// up, at most 180. The heights: 26 for one line (the pick's title 18, the padding of 2 and the border of 2 at the top
// and at the bottom) and 46 for two (18 and 16, the padding of 4 and the border). 20 from the point: half the symbol
// box of 36 and the gap of 2.
// Partitions: a label at each side; one line and two; with a badge; past the widest.
describe("an answer's label box around its point", () => {
  it('is 113 wide at the left for "13:00 수업 · 24동", 26 high, and centred on the point', () => {
    // Six digits 4.02, five narrow letters 1.45, three syllables 2.61: 8.08 × 12 = 96.96, and 16.
    expect(answerLabelBox(label('left', 'next', '13:00 수업 · 24동'))).toEqual({
      left: -133,
      top: -13,
      right: -20,
      bottom: 13,
    });
  });

  it("is 105 wide and 46 high below for the pick's two lines with its number", () => {
    // "302동식당" at 14: three digits 2.01 and three syllables 2.61, 64.68; "12:15 점심" at 12: 5.0 × 12 = 60. The
    // wider, the padding, the border, and the badge: 64.68 + 16 + 4 + 20 = 104.68.
    const pick = label('below', 'pick', '302동식당', { line: '12:15 점심', number: 1 });

    expect(answerLabelBox(pick)).toEqual({ left: -52.5, top: 20, right: 52.5, bottom: 66 });
  });

  it('is 64 wide at the right of the point for "나 · 15분", and 46 high above it with a line', () => {
    // 나, 분 1.74, three narrow 0.87, two digits 1.34: 3.95 × 12 = 47.4, and 16.
    expect(answerLabelBox(label('right', 'person', '나 · 15분'))).toEqual({
      left: 20,
      top: -13,
      right: 84,
      bottom: 13,
    });
    expect(answerLabelBox(label('above', 'pick', '학생회관식당', { line: '12:33 점심' }))).toMatchObject({
      top: -66,
      bottom: -20,
    });
  });

  it('is at most 180 wide, however long its words', () => {
    // "301동식당 · 지은은 13분밖에 못 있어요" alone is 16.4 × 12 = 196.8 wide.
    const reason = label('right', 'dropped', '301동식당 · 지은은 13분밖에 못 있어요');

    expect(answerLabelBox(reason)).toMatchObject({ left: 20, right: 200 });
  });
});

// Partitions: wide letters; moved to share an edge.
describe("an answer's label box with wide letters or a shift", () => {
  it('is 92 wide at the right for "W관 → 301동", its "W" and "→" wide letters', () => {
    // "W" and "→" 2.0, two syllables 1.74, two spaces 0.58, three digits 2.01: 6.33 × 12 = 75.96, and 16.
    expect(answerLabelBox(label('right', 'candidate', 'W관 → 301동'))).toMatchObject({ left: 20, right: 112 });
  });

  it('stands its shift further from the point at the left', () => {
    expect(answerLabelBox(label('left', 'next', '13:00 수업 · 24동', { shift: 9 }))).toMatchObject({
      left: -142,
      right: -29,
    });
  });
});

// A meal answer's chosen place (P04 ticket 74), its `note` its start. Partitions: short words; words past the widest,
// with a note and without.
describe("a meal answer's chosen place's label box", () => {
  const LONG = '콘마요핫도그, 웨지감자튀김, 미니토마토파스타, 양배추샐러드';

  it('is as wide as its longer line: 148 for "예술계식당 17:00" over "콘마요핫도그 외 2 메뉴 ›"', () => {
    // The title at 14: five syllables 4.35 and " 17:00" 3.26, 106.54; the line at 12, the wider: nine syllables 7.83,
    // four spaces 1.16, "2" 0.67, and "›" 1.0, 127.92; with the padding and the border, 147.92.
    const pick = label('below', 'pick', '예술계식당', { note: '17:00', line: '콘마요핫도그 외 2', action: '메뉴 ›' });

    expect(answerLabelBox(pick)).toMatchObject({ left: -74, right: 74 });
  });

  it(`is at most ${String(MEAL_PICK_MAX)} wide, the dish cut short, where a pick without a note may be ${String(SUB_MAX)}`, () => {
    const meal = answerLabelBox(label('below', 'pick', '예술계식당', { note: '17:00', line: LONG }));
    const other = answerLabelBox(label('below', 'pick', '예술계식당', { line: LONG }));

    expect(meal.right - meal.left).toBe(MEAL_PICK_MAX);
    expect(other.right - other.left).toBe(SUB_MAX);
  });
});

// A pick's label with its time (a meal's chosen place, a 관정 booking): its words grow with the font scale, and so does
// its cap, 200 at the usual size, so that a larger font does not cut its time (P01 ticket 30, the emulator started cold
// at 1.3). "관정 4층 그룹스터디룸 15:00" at 14: nine syllables 7.83, four narrow 1.16 (three spaces and ":"), five digits
// 3.35 (the "4" and four of the time's), 12.34 of the title's size, and 20 of padding and border.
// Partitions: font scale 1, 1.3 and 2; words within the cap and past it.
function width({ left, right }: { left: number; right: number }): number {
  return right - left;
}

describe("a pick's label with its time at a larger font", () => {
  const room = label('above', 'pick', '관정 4층 그룹스터디룸', { note: '15:00', line: '6인실 · 4명' });
  const long = label('above', 'pick', '자하연식당 2층 교직원식당 학생식당', { note: '11:30' });

  it('is as wide as before at font scale 1', () => {
    expect(width(answerLabelBox(room, 1))).toBe(Math.ceil(12.34 * 14 + 20));
  });

  it('keeps its whole time at 1.3, past the 200 it was cut at', () => {
    expect(width(answerLabelBox(room, 1.3))).toBe(Math.ceil(12.34 * 14 * 1.3 + 20));
  });

  it.each([
    [1, 200],
    [1.3, 260],
    [2, PICK_TIME_CEILING],
  ])('stops at its cap at font scale %s: %s', (scale, cap) => {
    expect(width(answerLabelBox(long, scale))).toBe(cap);
    expect(pickTimeMax(scale)).toBe(cap);
  });
});
