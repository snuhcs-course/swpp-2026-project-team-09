import { ApiError } from '@/api/errors';
import type { PositionUpload } from '@/api/types';
import type { Measured } from './phone';

// The decisions of the background sending, apart from the phone so that they can be tested.

// How often the phone is asked for a position in the background, against `POSITION_EVERY_MS` in front.
export const BACKGROUND_EVERY_MS = 30_000;

export interface BeforeUpload {
  signedIn: boolean;
  switchOn: boolean;
  // The User chose background sharing on this phone.
  chosen: boolean;
  inFront: boolean;
}

// `skip`: the app is in front, where `PositionSending` sends. `stop`: nothing may be sent any more.
export function beforeUpload({ signedIn, switchOn, chosen, inFront }: BeforeUpload): 'send' | 'skip' | 'stop' {
  if (!signedIn || !switchOn || !chosen) {
    return 'stop';
  }
  return inFront ? 'skip' : 'send';
}

// What follows an upload, from what it threw, null when the position was kept. A 401 here is one the client's renewal
// could not mend, or SESSION_REPLACED, which it does not renew; either way the client ended the Session.
export function afterUpload(error: unknown): 'go-on' | 'switch-off' | 'stop' {
  if (!(error instanceof ApiError)) {
    return 'go-on';
  }
  if (error.status === 409 && error.code === 'MASTER_SWITCH_OFF') {
    return 'switch-off';
  }
  return error.status === 401 || error.status === 403 ? 'stop' : 'go-on';
}

// The newest position of a batch the main server can take, one with an accuracy.
export function newestUpload(batch: readonly Measured[]): PositionUpload | null {
  let newest: PositionUpload | null = null;
  let newestAt = Number.NEGATIVE_INFINITY;
  for (const { position, accuracy, measuredAt } of batch) {
    if (accuracy !== null && measuredAt > newestAt) {
      newest = { ...position, accuracy, measuredAt: new Date(measuredAt).toISOString() };
      newestAt = measuredAt;
    }
  }
  return newest;
}

// Background sharing was running when this start of the app began, so the process that ran it ended, as when the User
// swiped the app away. Told once, when the signed-in screens first open.
export function stoppedWhileClosed(runningAtStart: boolean, firstOpen: boolean): boolean {
  return runningAtStart && firstOpen;
}
