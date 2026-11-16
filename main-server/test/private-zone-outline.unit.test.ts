/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The rules of a Private Zone's outline on rings measured in metres from one point on the campus: the winding test,
// the 10 m edge, the area, the checks of a body and the label.

import { HttpException } from '@nestjs/common';
import { z } from 'zod';
import { CampusBoundary } from '../src/common/campus-boundary.js';
import { encloses, enclosesByWinding, type Position, squareMetresInside } from '../src/common/geometry.js';
import { outlineOf, zoneHolds, zoneLabel } from '../src/location-sharing/private-zone-outline.js';
import { circleRound, offset, squareRound } from './zone-shapes.js';

const ORIGIN = { latitude: 37.46, longitude: 126.95 };
const at = (east: number, north: number): Position => offset(ORIGIN, east, north);

// 100 m on each side, from (0, 0) to (100, 100).
const square = [at(0, 0), at(100, 0), at(100, 100), at(0, 100)];

// Two lobes that meet at (50, 50), drawn one each way round.
const figureEight = [at(0, 0), at(100, 100), at(100, 0), at(0, 100)];

const twiceRound = [...square, ...square];

describe('enclosesByWinding', () => {
  it('a plain loop holds a position inside it, and not one just outside', () => {
    expect(enclosesByWinding(square, at(50, 50))).toBe(true);
    expect(enclosesByWinding(square, at(100.5, 50))).toBe(false);
    expect(enclosesByWinding(square, at(50, -0.5))).toBe(false);
  });

  it('a figure eight holds a position in each lobe, and not one beside where they meet', () => {
    expect(enclosesByWinding(figureEight, at(20, 50))).toBe(true);
    expect(enclosesByWinding(figureEight, at(80, 50))).toBe(true);
    expect(enclosesByWinding(figureEight, at(50, 20))).toBe(false);
  });

  it('a loop drawn twice round holds what it covers twice, which the even-odd rule leaves out', () => {
    expect(enclosesByWinding(twiceRound, at(50, 50))).toBe(true);
    expect(encloses(twiceRound, at(50, 50))).toBe(false);
  });

  it('reads a ring the same either way round', () => {
    expect(enclosesByWinding(square.toReversed(), at(50, 50))).toBe(true);
  });
});

describe('zoneHolds', () => {
  it.each([
    ['inside', at(50, 50), true],
    ['9 m outside an edge', at(109, 50), true],
    ['10 m outside an edge', at(110, 50), true],
    ['11 m outside an edge', at(111, 50), false],
    ['9 m out from a corner, diagonally', at(100 + 9 / Math.SQRT2, 100 + 9 / Math.SQRT2), true],
  ])('a position %s → %s', (_where, position, held) => {
    expect(zoneHolds(square, position)).toBe(held);
  });
});

describe('squareMetresInside', () => {
  it('is the area of a plain loop, either way round', () => {
    expect(squareMetresInside(square)).toBeCloseTo(10_000, 0);
    expect(squareMetresInside(square.toReversed())).toBeCloseTo(10_000, 0);
  });

  it('takes the turns of a loop that crosses itself from each other, as the shoelace sum does', () => {
    expect(squareMetresInside(figureEight)).toBeCloseTo(0, 0);
    expect(squareMetresInside(twiceRound)).toBeCloseTo(20_000, 0);
  });
});

// A campus 2 km on each side round the origin, and the code each body is refused with, or null.
const campus = new CampusBoundary([at(-1000, -1000), at(1000, -1000), at(1000, 1000), at(-1000, 1000)]);

function refusalOf(body: unknown): string | null {
  try {
    outlineOf(body, campus);
    return null;
  } catch (error) {
    if (!(error instanceof HttpException)) {
      throw error;
    }
    return z.object({ code: z.string() }).parse(error.getResponse()).code;
  }
}

describe('outlineOf', () => {
  it('takes an outline of 3 to 200 points and answers it as drawn', () => {
    expect(outlineOf({ outline: square }, campus)).toEqual(square);
    expect(outlineOf({ outline: circleRound(ORIGIN, 100, 200) }, campus)).toHaveLength(200);
  });

  it('drops a last point that repeats the first before counting', () => {
    const closed = circleRound(ORIGIN, 100, 200);
    expect(outlineOf({ outline: [...closed, closed[0]] }, campus)).toEqual(closed);
    expect(outlineOf({ outline: [...square, square[0]] }, campus)).toEqual(square);
  });

  it.each([
    ['no outline', {}],
    ['a key besides the outline', { outline: square, label: '집' }],
    ['a point that is not a pair of numbers', { outline: [...square, { latitude: '37.46', longitude: 126.95 }] }],
    ['a latitude past 90°', { outline: [...square, { latitude: 91, longitude: 126.95 }] }],
    ['two points', { outline: square.slice(0, 2) }],
    ['three points of which the last repeats the first', { outline: [at(0, 0), at(100, 0), at(0, 0)] }],
    ['201 points', { outline: circleRound(ORIGIN, 100, 201) }],
  ])('refuses %s as invalid', (_case, body) => {
    expect(refusalOf(body)).toBe('PRIVATE_ZONE_INVALID');
  });

  it('takes an outline that runs up to 300 m past the Campus Boundary', () => {
    expect(refusalOf({ outline: [at(900, 0), at(1290, 0), at(1290, 100), at(900, 100)] })).toBeNull();
  });

  it.each([
    ['a point more than 300 m past the Campus Boundary', [at(900, 0), at(1310, 0), at(1310, 100), at(900, 100)]],
    ['no point inside the Campus Boundary', [at(1050, 0), at(1250, 0), at(1250, 100), at(1050, 100)]],
  ])('refuses %s as off campus', (_case, outline) => {
    expect(refusalOf({ outline })).toBe('PRIVATE_ZONE_OFF_CAMPUS');
  });

  it('refuses an outline that encloses less than 300 m², and takes one of 300 m² or more', () => {
    expect(refusalOf({ outline: squareRound(ORIGIN, 17) })).toBe('PRIVATE_ZONE_TOO_SMALL');
    expect(refusalOf({ outline: figureEight })).toBe('PRIVATE_ZONE_TOO_SMALL');
    expect(refusalOf({ outline: squareRound(ORIGIN, 17.4) })).toBeNull();
  });
});

describe('zoneLabel', () => {
  it('names the zone after the Place nearest the middle of its bounding box', () => {
    const asked: Position[] = [];
    const label = zoneLabel([at(0, 0), at(100, 0), at(100, 40), at(60, 100)], (position) => {
      asked.push(position);
      return { number: '301', name: '제1공학관' };
    });

    expect(label).toBe('301동 근처');
    expect(asked).toHaveLength(1);
    expect(asked[0]?.latitude).toBeCloseTo(at(50, 50).latitude, 9);
    expect(asked[0]?.longitude).toBeCloseTo(at(50, 50).longitude, 9);
  });

  it('calls a Place without a number by its name', () => {
    expect(zoneLabel(square, () => ({ number: null, name: '자하연' }))).toBe('자하연 근처');
  });

  it('is 그린 구역 with no Place near', () => {
    expect(zoneLabel(square, () => null)).toBe('그린 구역');
  });
});
