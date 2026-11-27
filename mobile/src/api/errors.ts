/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// A refusal of the main server, or no answer from it. `status` is the HTTP status, 0 when nothing answered, `code`
// the main server's own word for the refusal where it gives one, such as ONBOARDING_REQUIRED, and `body` the whole
// refusal as it came, null when there was none. A request the app gave up itself, with no answer, says who gave it up
// in `givenUp`: `timeout` for its own timer, `caller` for its caller's signal (a query no screen shows any more);
// null for every other error, a network failure among them. The message is the same either way.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly body: unknown;
  readonly givenUp: GivenUp | null;

  constructor(status: number, code: string | null = null, body: unknown = null, givenUp: GivenUp | null = null) {
    super(code === null ? `The main server answered ${status}.` : `The main server answered ${status} ${code}.`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
    this.givenUp = givenUp;
  }
}

export type GivenUp = 'timeout' | 'caller';

// Whether something thrown is that refusal of the main server. For an operation whose answer for "none" is a refusal,
// such as 404 NOT_IN_PARTY for a User in no Party.
export function isRefusal(error: unknown, status: number, code: string): boolean {
  return error instanceof ApiError && error.status === status && error.code === code;
}
