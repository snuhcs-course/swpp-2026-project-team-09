/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { rangeAt, shareMove } from '@/screens/main/answer/card-drag';

// A drag on the answer sheet's content (P04 ticket 61): at every step the content scrolls first, as far as it has more
// than shows, and the card moves only at its ends; back toward where the card started, the card goes first. Values are
// points; a move down is positive, and so is the card's way down.
const RANGE = 100;

// Partitions: up and down within the content's range; up past its end; down past its top; back after the card moved.
describe('how a move on the content is shared out', () => {
  it('scrolls the content within its range and leaves the card', () => {
    expect(shareMove(-30, 0, 20, RANGE)).toEqual({ card: 0, list: 50 });
    expect(shareMove(30, 0, 50, RANGE)).toEqual({ card: 0, list: 20 });
  });

  it('raises the card by what is left past the content’s end', () => {
    expect(shareMove(-30, 0, 90, RANGE)).toEqual({ card: -20, list: RANGE });
  });

  it('lowers the card by what is left past the content’s top', () => {
    expect(shareMove(30, 0, 20, RANGE)).toEqual({ card: 10, list: 0 });
  });

  it('brings the card back first, then scrolls the content', () => {
    expect(shareMove(-30, 10, 0, RANGE)).toEqual({ card: 0, list: 20 });
    expect(shareMove(30, -20, RANGE, RANGE)).toEqual({ card: 0, list: 90 });
  });

  it('raises the card at once where all of the content shows', () => {
    expect(shareMove(-30, 0, 0, 0)).toEqual({ card: -30, list: 0 });
  });
});

// Partitions: a content longer than what shows, one as long, one shorter.
describe('how far the content scrolls', () => {
  it('scrolls by what it has more than shows, and not at all where it all shows', () => {
    expect(rangeAt(500, 300)).toBe(200);
    expect(rangeAt(300, 300)).toBe(0);
    expect(rangeAt(200, 300)).toBe(0);
  });
});
