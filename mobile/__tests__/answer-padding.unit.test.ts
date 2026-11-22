/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerDrawing } from '@/features/assistant/answer-marks';
import { labelArea, paddingOf } from '@/screens/main/use-answer-map';

// A drawing of one point and no marks, whose marks need the least room at each side: half the symbol box of 36, and 6.
const ONE_POINT: AnswerDrawing = {
  things: [],
  lines: [],
  points: [{ latitude: 37.45932, longitude: 126.95058 }],
  own: [],
  pick: null,
  userIds: [],
};

// Partitions: the answer frame, with its round "←" or its time bar at the top (the 2026-11-22 redesign), and a received
// invitation's card, without either; each under a status bar of 24 and over a card of 200. Expected values: the lists'
// top, where "←" or the bar stands, 52 from the screen's top, which is 28 under that status bar, the round "←"'s 44 or
// the bar's own height, the 8 of ticket 08's area between the labels and the top or the card, 24 for the marks above
// and below, and 64 at each side.
describe('the room a drawing is fitted into', () => {
  it('keeps the room of the round "←" at the top for an answer without a time bar', () => {
    // The 8 at the top and at the bottom are ticket 08's area.
    expect(paddingOf(24, 200, ONE_POINT, true)).toEqual({
      top: 24 + 28 + 44 + 8 + 24,
      right: 64,
      bottom: 200 + 8 + 24,
      left: 64,
    });
  });

  it('keeps the time bar\'s room at the top, in the place of "←", when the answer has one', () => {
    // A bar of 96 stands where the round "←" would.
    expect(paddingOf(24, 200, ONE_POINT, true, 96).top).toBe(24 + 28 + 96 + 8 + 24);
  });

  it('keeps the status bar and the room for a label at the top for an invitation, which has no pill', () => {
    // The 8 at the top and at the bottom are ticket 08's area.
    expect(paddingOf(24, 200, ONE_POINT, false)).toEqual({
      top: 24 + 8 + 24,
      right: 64,
      bottom: 200 + 8 + 24,
      left: 64,
    });
  });
});

// Partitions: the answer frame and a received invitation's card, on the emulator's view of 411 by 914 under a status
// bar of 24 and the card of 406 measured there; no card laid out yet. Expected values: ticket 08's area, 8 under the
// round "←" (its bottom 24 + 28 + 44 = 96) or the status bar, 8 over the card, and 16 from each side.
describe('the area the labels stay in', () => {
  const SIZE = { width: 411, height: 914 };

  it('runs from 8 under the round "←" to 8 over the card, 16 from each side', () => {
    expect(labelArea(24, 406, SIZE, true)).toEqual({ top: 104, right: 395, bottom: 500, left: 16 });
  });

  it('runs from 8 under the status bar for an invitation, which has no pill', () => {
    expect(labelArea(24, 406, SIZE, false)).toEqual({ top: 32, right: 395, bottom: 500, left: 16 });
  });

  it("runs to 8 over the view's bottom while no card is laid out", () => {
    expect(labelArea(24, null, SIZE, true).bottom).toBe(906);
  });
});
