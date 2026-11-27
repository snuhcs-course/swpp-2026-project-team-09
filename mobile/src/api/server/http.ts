/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { ApiError, type GivenUp } from '@/api/errors';
import { mainServerUrl } from '@/api/servers';
import type { Suggestion } from '@/api/types';
import { type Guard, isTokens } from './answers';
import { heldTokens, keepTokens } from '@/auth/tokens';
import { endSession, requireOnboarding } from '@/session/session-events';
import { requestFailed } from '@/telemetry';

// The one way to the main server. A request with the User's access token that is refused with 401 renews the Session
// once with the refresh token and is sent again. What a renewal cannot mend ends the Session: a refused renewal, a
// second 401, and a 401 with SESSION_REPLACED, which no renewal can mend. A 403 with ONBOARDING_REQUIRED takes the
// User to Onboarding with the suggestion it carries. A request that fails for good sends `api_request_failed` to the
// usage data (README.md, "Usage data"); one its caller gave up, and a 401 a renewal mended, send nothing.

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Request {
  body?: unknown;
  query?: Record<string, string | number>;
  // Such as an Idempotency-Key.
  headers?: Record<string, string>;
  // Whether the request carries the access token. Only the sign-in and the renewal go without one.
  signedIn?: boolean;
  // After how many milliseconds the request is given up, as no answer (status 0, `givenUp` `timeout`); unset, it waits
  // as long as the phone's own networking does.
  timeoutMs?: number;
  // Gives the request up, as no answer (status 0, `givenUp` `caller`), when it aborts: a query that no screen shows any
  // more.
  signal?: AbortSignal;
}

function field(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, name) : undefined;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

// The suggestion a 403 ONBOARDING_REQUIRED carries as `onboarding.suggestion`. A part it lacks is null.
export function suggestionOf(error: ApiError): Suggestion {
  const suggestion = field(field(error.body, 'onboarding'), 'suggestion');
  return { name: textOrNull(field(suggestion, 'name')), department: textOrNull(field(suggestion, 'department')) };
}

function urlOf(path: string, query: Request['query']): string {
  const search = Object.entries(query ?? {})
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${mainServerUrl()}${path}${search === '' ? '' : `?${search}`}`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') {
    return null;
  }
  try {
    const body: unknown = JSON.parse(text);
    return body;
  } catch {
    return text;
  }
}

interface GivingUp {
  signal: AbortSignal;
  // Who gave the request up, if it was given up: its own timer or its caller, whichever came first.
  givenUp: () => GivenUp | null;
  // Stops the timer and the listening, once the request is over.
  done: () => void;
}

// The request's own abort: by its timer after `timeoutMs`, or by its caller's `signal`.
function givingUp(request: Request): GivingUp {
  const abort = new AbortController();
  let givenUp: GivenUp | null = null;
  const giveUp = (by: GivenUp): void => {
    if (!abort.signal.aborted) {
      givenUp = by;
      abort.abort();
    }
  };
  const timer =
    request.timeoutMs === undefined
      ? null
      : setTimeout(() => {
          giveUp('timeout');
        }, request.timeoutMs);
  const stop = (): void => {
    giveUp('caller');
  };
  request.signal?.addEventListener('abort', stop);
  if (request.signal?.aborted === true) {
    giveUp('caller');
  }
  return {
    signal: abort.signal,
    givenUp: () => givenUp,
    done: (): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      request.signal?.removeEventListener('abort', stop);
    },
  };
}

// Sends the request once and gives the answer's body, or throws the refusal. Nothing answering is status 0, with who
// gave the request up when the app did.
async function send(method: Method, path: string, request: Request, accessToken: string | null): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json', ...request.headers };
  if (request.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken !== null) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const giving = givingUp(request);
  let response: Response;
  let body: unknown;
  try {
    response = await fetch(urlOf(path, request.query), {
      method,
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: giving.signal,
    });
    body = await readBody(response);
  } catch {
    throw new ApiError(0, null, null, giving.givenUp());
  } finally {
    giving.done();
  }
  if (!response.ok) {
    throw new ApiError(response.status, textOrNull(field(body, 'code')), body);
  }
  return body;
}

async function renew(): Promise<boolean> {
  const refreshToken = heldTokens()?.refreshToken;
  if (refreshToken === undefined) {
    return false;
  }
  try {
    const tokens = await send('POST', '/auth/refresh', { body: { refreshToken } }, null);
    if (!isTokens(tokens)) {
      return false;
    }
    await keepTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    return true;
  } catch (error) {
    // No answer is no refusal: the Session may still be good, and the next request tries again.
    if (error instanceof ApiError && error.status === 0) {
      throw error;
    }
    return false;
  }
}

let renewing: Promise<boolean> | null = null;

// Renews the Session with the refresh token: true with new tokens kept, false when the main server refused, which
// leaves the Session to be ended. Throws when nothing answered. Requests that are refused at the same moment share one
// renewal, since a refresh token is used once.
export function renewSession(): Promise<boolean> {
  renewing ??= renew().finally(() => {
    renewing = null;
  });
  return renewing;
}

async function refused(error: ApiError): Promise<never> {
  if (error.status === 401) {
    await endSession(error.code === 'SESSION_REPLACED');
  } else if (error.status === 403 && error.code === 'ONBOARDING_REQUIRED') {
    await requireOnboarding(suggestionOf(error));
  }
  throw error;
}

async function sendSignedIn(method: Method, path: string, request: Request): Promise<unknown> {
  if (request.signedIn === false) {
    return send(method, path, request, null);
  }
  try {
    return await send(method, path, request, heldTokens()?.accessToken ?? null);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status === 0) {
      throw error;
    }
    if (error.status !== 401 || error.code === 'SESSION_REPLACED') {
      return refused(error);
    }
  }
  if (!(await renewSession())) {
    return refused(new ApiError(401));
  }
  try {
    return await send(method, path, request, heldTokens()?.accessToken ?? null);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status === 0) {
      throw error;
    }
    return refused(error);
  }
}

// Gives the answer's body once `isAnswer` finds it in the main server's shape for this route. A refusal is thrown as
// an `ApiError`, after the Session followed it. An answer of another shape is thrown as one with status 0, as no
// answer is, with the code UNEXPECTED_ANSWER.
export async function call<Answer>(
  method: Method,
  path: string,
  isAnswer: Guard<Answer>,
  request: Request = {},
): Promise<Answer> {
  try {
    const body = await sendSignedIn(method, path, request);
    if (!isAnswer(body)) {
      throw new ApiError(0, 'UNEXPECTED_ANSWER', body);
    }
    return body;
  } catch (error) {
    requestFailed(method, path, error);
    throw error;
  }
}
