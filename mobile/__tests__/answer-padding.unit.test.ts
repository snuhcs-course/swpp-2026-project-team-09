/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerDrawing } from '@/features/assistant/answer-marks';
import { paddingOf } from '@/screens/main/use-answer-map';

// A drawing of one point and no marks, whose marks need the least room at each side: half the symbol box of 36, and 6.
const ONE_POINT: AnswerDrawing = {
  things: [],
  lines: [],
  points: [{ latitude: 37.45932, longitude: 126.95058 }],
  own: [],
  pick: null,
  userIds: [],
};

// Partitions: the answer frame, with its pill at the top, and a received invitation's card, without one; each under a
// status bar of 24 and over a card of 200. Expected values: the lists' and the pill's top 52 from the screen's top,
// which is 28 under that status bar, the pill's 48, 24 for the marks above and below, and 64 at each side.
describe('the room a drawing is fitted into', () => {
  it("keeps the pill's room at the top for an answer", () => {
    expect(paddingOf(24, 200, ONE_POINT, true)).toEqual({ top: 24 + 28 + 48 + 24, right: 64, bottom: 224, left: 64 });
  });

  it('keeps the status bar and the room for a label at the top for an invitation, which has no pill', () => {
    expect(paddingOf(24, 200, ONE_POINT, false)).toEqual({ top: 24 + 24, right: 64, bottom: 224, left: 64 });
  });
});
