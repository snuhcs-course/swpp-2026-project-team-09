/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type CalibrationWalk, fitSpeedAndClimb, recoveredInput } from '../scripts/walking/fit.ts';

// Walks that take exactly metres / speed + climb × climbSeconds.
function walksAt(speed: number, climbSeconds: number): CalibrationWalk[] {
  return [
    { metres: 100, climb: 0 },
    { metres: 200, climb: 5 },
    { metres: 300, climb: 2 },
    { metres: 150, climb: 10 },
  ].map(({ metres, climb }, index) => ({
    pair: `C${index + 1}`,
    walked: metres / speed + climb * climbSeconds,
    metres,
    climb,
  }));
}

describe('the calibration fit', () => {
  it('gives back the speed and the climb value that the walks were built from', () => {
    const fit = fitSpeedAndClimb(walksAt(1.4, 2));

    expect(fit.metresPerSecond).toBeCloseTo(1.4, 10);
    expect(fit.fittedClimbSecondsPerMetre).toBeCloseTo(2, 10);
    expect(fit.climbSecondsPerMetre).toBeCloseTo(2, 10);
  });

  it('makes a climb value below 0 into 0 and keeps the speed of that same fit', () => {
    const fit = fitSpeedAndClimb(walksAt(1.25, -1));

    expect(fit.fittedClimbSecondsPerMetre).toBeCloseTo(-1, 10);
    expect(fit.climbSecondsPerMetre).toBe(0);
    // Fitted again on metres alone, the speed would be about 1.28 m/s.
    expect(fit.metresPerSecond).toBeCloseTo(1.25, 10);
  });
});

describe("a calibration pair's inputs, recovered from the table at the freeze", () => {
  it('takes the climb off the seconds and walks the rest at 1.1 m/s', () => {
    const { metres, climb } = recoveredInput({ tableSeconds: 160, fromElevation: 100, toElevation: 120 });

    expect(metres).toBeCloseTo(110, 10);
    expect(climb).toBe(20);
  });

  it('counts no climb going down', () => {
    const { metres, climb } = recoveredInput({ tableSeconds: 100, fromElevation: 120, toElevation: 100 });

    expect(metres).toBeCloseTo(110, 10);
    expect(climb).toBe(0);
  });
});
