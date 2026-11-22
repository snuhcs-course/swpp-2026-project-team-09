/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { besidePlace } from '@/screens/main/answer/mark-card';

// P04 ticket 14, item 2: a face's card stands beside the face, on the side that keeps the pick's flag clear. Expected
// values: worked by hand on a stage 500 wide, a face at x 250, and a card 160 wide and 100 high (the gap is 28, the
// edge 16): at the right it spans 278 to 438, at the left 62 to 222.

const STAGE = { width: 500, height: 800 };
const SIZE = { width: 160, height: 100 };
const FACE = { x: 250, y: 400 };

describe("a face's card beside the face", () => {
  it('stands at the right when nothing is to keep clear', () => {
    expect(besidePlace(FACE, SIZE, STAGE, null)).toEqual({ left: 278, top: 350 });
  });

  it("stands at the left when the pick's flag is where the right one would be", () => {
    expect(besidePlace(FACE, SIZE, STAGE, { x: 360, y: 420 }).left).toBe(62);
  });

  it("stays at the right when the pick's flag is elsewhere", () => {
    expect(besidePlace(FACE, SIZE, STAGE, { x: 360, y: 700 }).left).toBe(278);
  });

  it('stays at the right when the left side has no room for it', () => {
    const near = { x: 100, y: 400 };
    expect(besidePlace(near, SIZE, STAGE, { x: 200, y: 420 }).left).toBe(128);
  });
});
