/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { closeHintPlace, HINT_GAP } from '@/screens/main/answer/raise-handle';

// Where "놓으면 지도 화면으로 돌아가요" stands while the answer card is dragged down to close (P04 ticket 29): above the
// card's top edge, following it down, and never lower than just above the AI input's room (`barRoom`), so that it is
// never behind the input or below the screen.

const BAR_ROOM = 96;

// Partitions: a card taller than the input's room; one no taller than it.
describe("the drag-down hint's place", () => {
  it('stands just above the card, and follows it down only as far as just above the input', () => {
    const { bottom, maxDrop } = closeHintPlace(300, BAR_ROOM);

    expect(bottom).toBe(300 + HINT_GAP);
    expect(bottom - maxDrop).toBe(BAR_ROOM + HINT_GAP);
    expect(bottom - maxDrop).toBeGreaterThan(BAR_ROOM);
  });

  it('does not move with a card no taller than the input room', () => {
    expect(closeHintPlace(80, BAR_ROOM)).toEqual({ bottom: 80 + HINT_GAP, maxDrop: 0 });
  });
});
