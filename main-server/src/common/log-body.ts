/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// How a request's or a response's body is written on its request line (README.md: Logging).

export const BODY_LIMIT_BYTES = 2048;
const TRUNCATED = '…(truncated)';
const SECRET_NAME = /token|password|secret|authorization/iu;

// The body as one text for the log: JSON with every secret's value masked and cut at BODY_LIMIT_BYTES, or, for a body
// that is not JSON, its type and size only. No body gives undefined.
export function logBody(body: unknown, contentType: string | undefined): string | undefined {
  if (body === undefined || body === null || body === '') {
    return undefined;
  }
  if (Buffer.isBuffer(body)) {
    return bodySize(contentType, body.length);
  }
  let value: unknown = body;
  if (typeof body === 'string') {
    if (!isJsonType(contentType)) {
      return bodySize(contentType, Buffer.byteLength(body));
    }
    try {
      value = JSON.parse(body);
    } catch {
      return bodySize(contentType, Buffer.byteLength(body));
    }
  }
  return truncate(JSON.stringify(masked(value)));
}

export function bodySize(contentType: string | undefined, bytes: number): string {
  const type = contentType?.split(';')[0]?.trim() ?? '';
  return `[${type === '' ? 'unknown type' : type} ${bytes} bytes]`;
}

function isJsonType(contentType: string | undefined): boolean {
  return contentType?.split(';')[0]?.trim().endsWith('json') ?? false;
}

function masked(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => masked(item));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [name, SECRET_NAME.test(name) ? '[masked]' : masked(item)]),
    );
  }
  return value;
}

function truncate(text: string): string {
  const bytes = Buffer.from(text);
  if (bytes.length <= BODY_LIMIT_BYTES) {
    return text;
  }
  // A character cut in two decodes to U+FFFD, which is dropped.
  return `${bytes.subarray(0, BODY_LIMIT_BYTES).toString('utf8').replace(/�+$/u, '')}${TRUNCATED}`;
}
