// A refusal of the main server, or no answer from it. `status` is the HTTP status, 0 when nothing answered, `code`
// the main server's own word for the refusal where it gives one, such as ONBOARDING_REQUIRED, and `body` the whole
// refusal as it came, null when there was none.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly body: unknown;

  constructor(status: number, code: string | null = null, body: unknown = null) {
    super(code === null ? `The main server answered ${status}.` : `The main server answered ${status} ${code}.`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

// Whether something thrown is that refusal of the main server. For an operation whose answer for "none" is a refusal,
// such as 404 NOT_IN_PARTY for a User in no Party.
export function isRefusal(error: unknown, status: number, code: string): boolean {
  return error instanceof ApiError && error.status === status && error.code === code;
}
