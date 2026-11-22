/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { space } from '@/design-system';
import { bothFit } from '@/screens/main/answer/choice-row';

// A secondary choice and the main one share a row while both words fit their half on one line, as measured (P04
// ticket 50). Partitions: not measured yet; both short; one too long at a large font; a phone 360 wide.
describe('the choices’ one row', () => {
  // A row 328 wide (a phone 360 wide, less the sheet's 16 at each side): each cell 160, its words' room 118.
  const ROW = 360 - 2 * space[4];

  it('stays one row until the row and both words are measured', () => {
    expect(bothFit(0, [40, 60])).toBe(true);
    expect(bothFit(ROW, [40, undefined])).toBe(true);
  });

  it('keeps one row while both words fit their cell', () => {
    expect(bothFit(ROW, [70, 50])).toBe(true);
  });

  it('falls back to two rows when either word is wider than its cell’s room', () => {
    expect(bothFit(ROW, [70, 150])).toBe(false);
    expect(bothFit(ROW, [119, 40])).toBe(false);
  });
});
