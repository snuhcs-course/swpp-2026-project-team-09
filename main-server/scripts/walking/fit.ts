/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The calibration of P04's evidence/06, as P11's evidence/01 reads it: seconds = metres / speed + climb × climb seconds
// per metre, fitted by ordinary least squares with no constant term.

// The build the frozen table came from.
export const FROZEN_METRES_PER_SECOND = 1.1;
export const FROZEN_CLIMB_SECONDS_PER_METRE = 3;

export interface CalibrationWalk {
  pair: string;
  walked: number;
  metres: number;
  climb: number;
}

export interface Fit {
  metresPerSecond: number;
  fittedClimbSecondsPerMetre: number;
  // The fitted value, or 0 when it is below 0; the speed stays that same fit's.
  climbSecondsPerMetre: number;
}

export function recoveredInput({
  tableSeconds,
  fromElevation,
  toElevation,
}: {
  tableSeconds: number;
  fromElevation: number;
  toElevation: number;
}): { metres: number; climb: number } {
  const climb = Math.max(0, toElevation - fromElevation);
  return { metres: (tableSeconds - climb * FROZEN_CLIMB_SECONDS_PER_METRE) * FROZEN_METRES_PER_SECOND, climb };
}

export function fitSpeedAndClimb(walks: readonly CalibrationWalk[]): Fit {
  const sum = (term: (walk: CalibrationWalk) => number): number => walks.reduce((total, walk) => total + term(walk), 0);
  const metresSquared = sum(({ metres }) => metres ** 2);
  const climbSquared = sum(({ climb }) => climb ** 2);
  const metresClimb = sum(({ metres, climb }) => metres * climb);
  const metresWalked = sum(({ metres, walked }) => metres * walked);
  const climbWalked = sum(({ climb, walked }) => climb * walked);
  const determinant = metresSquared * climbSquared - metresClimb ** 2;
  const secondsPerMetre = (metresWalked * climbSquared - climbWalked * metresClimb) / determinant;
  const climbSeconds = (metresSquared * climbWalked - metresClimb * metresWalked) / determinant;
  return {
    metresPerSecond: 1 / secondsPerMetre,
    fittedClimbSecondsPerMetre: climbSeconds,
    climbSecondsPerMetre: Math.max(0, climbSeconds),
  };
}
