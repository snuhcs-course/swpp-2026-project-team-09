/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bits = '';
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let encoded = '';
  for (let start = 0; start < bits.length; start += 6) {
    encoded += ALPHABET.charAt(Number.parseInt(bits.slice(start, start + 6).padEnd(6, '0'), 2));
  }
  return encoded;
}

// An ID token as Google writes one, with these claims and a signature that nobody checks.
export function idTokenOf(claims: Record<string, unknown>): string {
  return [base64Url('{"alg":"RS256","typ":"JWT"}'), base64Url(JSON.stringify(claims)), base64Url('signature')].join(
    '.',
  );
}
