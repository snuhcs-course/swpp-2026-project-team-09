/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { isTooSmall, zoneHolds } from '@/api/private-zone-outline';
import { BUILDING_301, figureEight, offset, rectangleRound, squareRound, starRound } from '../support/zone-shapes';

// A Private Zone's outline as the main server judges it (P02 spec, "The Private Zone"; decisions 3 to 5): too small
// when it fits in a 17 m square, and holding a position inside it by the nonzero winding rule or within 10 m of it.

describe('an outline too small to keep', () => {
  it('fits in a 17 m square: both sides of its box under 17 m', () => {
    expect(isTooSmall(squareRound(BUILDING_301, 16))).toBe(true);
  });

  it('is not one with a side of 17 m or more', () => {
    expect(isTooSmall(rectangleRound(BUILDING_301, 10, 18))).toBe(false);
  });

  it('is not a figure eight of two equal lobes, whose shoelace sum is near zero', () => {
    expect(isTooSmall(figureEight(BUILDING_301, 15))).toBe(false);
  });
});

describe('a position a zone holds', () => {
  const SQUARE = squareRound(BUILDING_301, 100);

  it('is inside the outline', () => {
    expect(zoneHolds(SQUARE, BUILDING_301)).toBe(true);
  });

  it('is outside it within 10 m of its edge, and not 15 m out', () => {
    expect(zoneHolds(SQUARE, offset(BUILDING_301, 58, 0))).toBe(true);
    expect(zoneHolds(SQUARE, offset(BUILDING_301, 65, 0))).toBe(false);
  });

  it('is inside a loop drawn twice round, by the nonzero rule', () => {
    expect(zoneHolds([...SQUARE, ...SQUARE], BUILDING_301)).toBe(true);
  });

  it('is in the middle of a star drawn as one loop, which it goes round twice', () => {
    expect(zoneHolds(starRound(BUILDING_301, 50), BUILDING_301)).toBe(true);
  });

  it('is in either lobe of a figure eight, which turn opposite ways', () => {
    const eight = figureEight(BUILDING_301, 60);

    expect(zoneHolds(eight, offset(BUILDING_301, -40, 0))).toBe(true);
    expect(zoneHolds(eight, offset(BUILDING_301, 40, 0))).toBe(true);
    expect(zoneHolds(eight, offset(BUILDING_301, 0, 40))).toBe(false);
  });
});
