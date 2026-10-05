// A refusal of the main server, or no answer from it. `status` is the HTTP status, 0 when nothing answered, and
// `code` the main server's own word for the refusal where it gives one, such as ONBOARDING_REQUIRED.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null = null) {
    super(code === null ? `The main server answered ${status}.` : `The main server answered ${status} ${code}.`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
