/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// What a provider's failed call says, read from its URL's host, its HTTP status and the error type in its body (spec
// A01). The adapter reads these off the model library's error; the log never holds the body itself.

export interface ProviderFailure {
  url: string;
  statusCode?: number;
  responseBody?: string;
}

// HTTP statuses of a momentary overload: too many requests (429), and Anthropic's overloaded (529).
const OVERLOAD_STATUSES = new Set([429, 529]);

// Anthropic's 429 once the usage tier's monthly spend limit is reached, which stays until the limit changes.
const SPEND_CAP = 'enforced_spend_limit_reached';

// Whether the call failed on a momentary overload, which one more try may get past.
export function isOverload({ statusCode, responseBody = '' }: ProviderFailure): boolean {
  return OVERLOAD_STATUSES.has(statusCode ?? 0) && !responseBody.includes(SPEND_CAP);
}

// The provider a failed call went to, by its host only.
export function providerOf({ url }: ProviderFailure): string | null {
  try {
    const { hostname } = new URL(url);
    if (hostname === 'api.anthropic.com') {
      return 'Anthropic';
    }
    return hostname === 'openrouter.ai' ? 'OpenRouter' : null;
  } catch {
    return null;
  }
}

// What the failure says of a spending limit. OpenRouter answers 402 once the credit is used up. Anthropic answers 429
// enforced_spend_limit_reached once the usage tier's cap is reached, and 400 invalid_request_error naming the usage
// limits once the account's own limit, set in the Console, is.
export function limitOf({ statusCode, responseBody = '' }: ProviderFailure): string {
  if (statusCode === 402) {
    return ', the OpenRouter credit is used up';
  }
  if (statusCode === 429 && responseBody.includes(SPEND_CAP)) {
    return ", the Anthropic usage tier's spend limit is reached";
  }
  if (statusCode === 400 && responseBody.includes('invalid_request_error') && /usage limits?/iu.test(responseBody)) {
    return ", the Anthropic account's spend limit is reached";
  }
  return '';
}

function reasonOf(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  return reason instanceof Error ? reason : new Error('Aborted');
}

// Waits `ms`, or rejects with the signal's reason as soon as it aborts.
export function waited(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(reasonOf(signal));
      return;
    }
    const aborted = (): void => {
      clearTimeout(timer);
      if (signal !== undefined) {
        reject(reasonOf(signal));
      }
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', aborted);
      resolve();
    }, ms);
    signal?.addEventListener('abort', aborted, { once: true });
  });
}
