/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { ApiError } from '@/api/errors';
import { isLibraryError, type LibraryFailure } from '@/library/errors';
import {
  type Failure,
  type FriendshipHow,
  type JoinHow,
  type LibraryCode,
  type Method,
  type ServerCode,
  scrubbedRoute,
  serverCode,
  type Visibility,
} from './events';
import { track } from './usage';

// The five actions' three stages, and `api_request_failed` (README.md, "Usage data"). An action sends
// `<action>_requested` before its request, then `<action>_completed` once the answer reached the phone, or
// `<action>_failed` with `reason` and `code` worked out from what the request threw. Nothing here changes what a
// request returns or throws, and a failure of PostHog's own stays inside the layer.

// An action that goes to the main server, with the properties its three stages share.
export type ServerAction =
  | { action: 'assistant_reply' }
  | { action: 'party_creation'; visibility: Visibility }
  | { action: 'party_join'; how: JoinHow }
  | { action: 'friendship_creation'; how: FriendshipHow };

// A stage of an action, `failed` with why.
type Stage = { stage: 'requested' | 'completed' } | { stage: 'failed'; failure: Failure<ServerCode> };

// Sends an event without letting anything PostHog throws reach the action.
function safely(send: () => void): void {
  try {
    send();
  } catch {
    // The User's action goes on whatever PostHog does.
  }
}

function sendStage(action: ServerAction, stage: Stage): void {
  switch (action.action) {
    case 'assistant_reply': {
      if (stage.stage === 'failed') {
        track('assistant_reply_failed', stage.failure);
      } else {
        track(`assistant_reply_${stage.stage}`);
      }
      break;
    }
    case 'party_creation': {
      const shared = { visibility: action.visibility };
      if (stage.stage === 'failed') {
        track('party_creation_failed', { ...shared, ...stage.failure });
      } else {
        track(`party_creation_${stage.stage}`, shared);
      }
      break;
    }
    case 'party_join': {
      const shared = { how: action.how };
      if (stage.stage === 'failed') {
        track('party_join_failed', { ...shared, ...stage.failure });
      } else {
        track(`party_join_${stage.stage}`, shared);
      }
      break;
    }
    case 'friendship_creation': {
      const shared = { how: action.how };
      if (stage.stage === 'failed') {
        track('friendship_creation_failed', { ...shared, ...stage.failure });
      } else {
        track(`friendship_creation_${stage.stage}`, shared);
      }
      break;
    }
  }
}

// Why a request to the main server failed, or null for one its caller gave up, which is no failure:
// - status 0 given up by its own timer: `timeout`; status 0 otherwise: `network`;
// - a 4xx with the main server's code: `refused`, with that code;
// - a 5xx, a 4xx without a code, an answer of an unknown shape (status 0 with UNEXPECTED_ANSWER), or anything that is
//   not an `ApiError`: `server_error`.
export function serverFailure(error: unknown): Failure<ServerCode> | null {
  if (!(error instanceof ApiError)) {
    return { reason: 'server_error' };
  }
  if (error.status === 0) {
    if (error.givenUp === 'caller') {
      return null;
    }
    if (error.givenUp === 'timeout') {
      return { reason: 'timeout' };
    }
    return error.code === null ? { reason: 'network' } : { reason: 'server_error' };
  }
  const code = error.status >= 400 && error.status < 500 ? serverCode(error.code) : null;
  return code === null ? { reason: 'server_error' } : { reason: 'refused', code };
}

const LIBRARY_CODES: Readonly<Record<Exclude<LibraryFailure, 'network'>, LibraryCode>> = {
  sessionEnded: 'session_ended',
  noSession: 'no_session',
  notAllowed: 'not_allowed',
};

// Why a call to 관정도서관 failed, by the `LibraryError`'s kind only: nothing of the library but these fixed words.
// Anything else thrown is `server_error`.
export function libraryFailure(error: unknown): Failure<LibraryCode> {
  if (!isLibraryError(error)) {
    return { reason: 'server_error' };
  }
  return error.kind === 'network' ? { reason: 'network' } : { reason: 'refused', code: LIBRARY_CODES[error.kind] };
}

// Runs an action's request between its stages, and gives back what the request gave or throws what it threw.
export async function trackAction<Answer>(action: ServerAction, request: () => Promise<Answer>): Promise<Answer> {
  safely(() => {
    sendStage(action, { stage: 'requested' });
  });
  let answer: Answer;
  try {
    answer = await request();
  } catch (error) {
    const failure = serverFailure(error);
    if (failure !== null) {
      safely(() => {
        sendStage(action, { stage: 'failed', failure });
      });
    }
    throw error;
  }
  safely(() => {
    sendStage(action, { stage: 'completed' });
  });
  return answer;
}

// A seat's booking, whose outcome the caller decides: the library may answer without a booking, and only a read of
// the seats after it tells a seat just taken. `seatBooking()` sends `seat_booking_requested` at once, just before
// `library.book`.
export interface SeatBookingStages {
  booked: () => void;
  // The library answered without a booking: `seat_taken` when the seat is no longer free, `not_allowed` otherwise.
  notBooked: (code: 'seat_taken' | 'not_allowed') => void;
  // The call threw.
  threw: (error: unknown) => void;
}

export function seatBooking(): SeatBookingStages {
  safely(() => {
    track('seat_booking_requested');
  });
  return {
    booked: () => {
      safely(() => {
        track('seat_booking_completed');
      });
    },
    notBooked: (code) => {
      safely(() => {
        track('seat_booking_failed', { reason: 'refused', code });
      });
    },
    threw: (error) => {
      safely(() => {
        track('seat_booking_failed', libraryFailure(error));
      });
    },
  };
}

// A request to the main server failed for good, as `call` throws it: after the Session followed a refusal, so that a
// 401 a renewal mended is no failure. A request its caller gave up sends nothing. `route` is the request's path by the
// layer's scrubbing, never its query.
export function requestFailed(method: Method, path: string, error: unknown): void {
  const failure = serverFailure(error);
  if (failure === null) {
    return;
  }
  safely(() => {
    track('api_request_failed', { route: scrubbedRoute(path), method, reason: failure.reason });
  });
}
