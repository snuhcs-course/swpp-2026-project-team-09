/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLabel, answerLabelBox } from '@/design-system';

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
// a space, "·", or ":" 0.29, any other letter 0.67), at 12 points, or 14 for the pick's title; the sum rounded up, at
// most 180. The heights: 26 for one line (the pick's title 18, the padding of 2 and the border of 2 at the top and
// at the bottom) and 46 for two (18 and 16, the padding of 4 and the border). 20 from the point: half the symbol box
// of 36 and the gap of 2.
// Partitions: a label at each side; one line and two; with a badge; past the widest; moved to share an edge.
describe("an answer's label box around its point", () => {
  it('is 113 wide at the left for "13:00 수업 · 24동", 26 high and centred on the point', () => {
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

  it('stands its shift further from the point at the left', () => {
    expect(answerLabelBox(label('left', 'next', '13:00 수업 · 24동', { shift: 9 }))).toMatchObject({
      left: -142,
      right: -29,
    });
  });
});
