/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { libraryCardFailures, libraryCardOf } from '../eval/library-card.ts';
import { names } from './eval-traces.ts';

// The library card read from its key (P13 ticket 04): a card that holds only its key is read from the key's five fixed
// segments and its optional `s=` (seat) and `e=` (equipment), as src/assistant/library/library-card.ts writes them, so
// that a card's seat and equipment are scored even when the card has no field for them (R1's M2 equipment 0/6). A
// harness test, reported apart from the product's pyramid (ADR 0007). No app, no model.

const card = (library: Record<string, unknown>): unknown => ({ kind: 'library', library });

describe('A library card read from its key', () => {
  it('reads the five fixed segments, with no seat or equipment when the key has neither', () => {
    expect(libraryCardOf(card({ key: 'book:7F-7A-zone2:2026-11-04:1700:60' }), names)).toMatchObject({
      action: 'book',
      space: '7F-7A-zone2',
      date: '2026-11-04',
      start: '17:00',
      minutes: 60,
      seat: null,
      equipment: null,
    });
  });

  it('reads the seat from s= and the equipment from e=, in either order', () => {
    expect(libraryCardOf(card({ key: 'book:7F-7A-zone2:2026-11-04:1800:180:s=7300' }), names)).toMatchObject({
      minutes: 180,
      seat: '7300',
      equipment: null,
    });
    expect(
      libraryCardOf(card({ key: 'book:4F-group-6:2026-11-05:1600:120:e=with-electronic-whiteboard' }), names),
    ).toMatchObject({ minutes: 120, seat: null, equipment: 'with-electronic-whiteboard' });
    expect(
      libraryCardOf(card({ key: 'book:6F-media-carrel:2026-11-05:1300:120:e=with-imac:s=Media Carrel A' }), names),
    ).toMatchObject({ space: '6F-media-carrel', seat: 'Media Carrel A', equipment: 'with-imac' });
  });

  it("prefers the card's own fields to its key, a field left null falling back to the key", () => {
    const key = 'book:7F-7A-zone2:2026-11-04:1800:180:s=7300:e=with-outlet';
    expect(libraryCardOf(card({ key, seat: '7100', equipment: 'none' }), names)).toMatchObject({
      seat: '7100',
      equipment: 'none',
    });
    expect(libraryCardOf(card({ key, seat: null, equipment: null }), names)).toMatchObject({
      seat: '7300',
      equipment: 'with-outlet',
    });
  });

  it("takes the key's equipment before the space's group", () => {
    const space = { id: '4F-group-6', group: 'without-whiteboard' };
    expect(
      libraryCardOf(card({ key: 'book:4F-group-6:2026-11-05:1600:120:e=with-electronic-whiteboard', space }), names),
    ).toMatchObject({ equipment: 'with-electronic-whiteboard' });
    expect(libraryCardOf(card({ key: 'book:4F-group-6:2026-11-05:1600:120', space }), names)).toMatchObject({
      equipment: 'without-whiteboard',
    });
  });

  it('matches an expectation of the seat or the equipment from the key alone', () => {
    const seen = [
      libraryCardOf(card({ key: 'book:4F-group-6:2026-11-05:1600:120:e=with-electronic-whiteboard' }), names),
      libraryCardOf(card({ key: 'book:6F-media-carrel:2026-11-05:1300:120:s=Media Carrel A' }), names),
    ].flatMap((read) => (read === null ? [] : [read]));
    const wanted = (space: string, conditions: Record<string, unknown>) => ({
      kind: 'library' as const,
      seeds: [],
      action: 'book' as const,
      space,
      conditions,
    });

    expect(libraryCardFailures(wanted('4F-group-6', { equipment: 'with-electronic-whiteboard' }), seen)).toEqual([]);
    expect(libraryCardFailures(wanted('6F-media-carrel', { seat: 'Media Carrel A' }), seen)).toEqual([]);
    expect(libraryCardFailures(wanted('6F-media-carrel', { equipment: 'Media Carrel A' }), seen)).toEqual([
      '0 library book 6F-media-carrel cards, fewer than 1 (closest differs in equipment)',
    ]);
  });
});
