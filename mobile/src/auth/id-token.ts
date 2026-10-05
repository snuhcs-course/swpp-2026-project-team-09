// Reads what a Google ID token says about its account. A token is three base64url parts joined by dots, and the
// middle one is the claims as JSON.
//
// Nothing here checks the signature, the audience or the expiry, so the claims are only as true as the phone they came
// from. From ticket 12 on the main server verifies the signature and the claims and gives the word that counts. Until
// then this check in the app only decides what the sign-in screen says.
//
// The decoding relies on `decodeURIComponent` and `JSON.parse` alone, which every JavaScript engine has. It uses no
// `atob`, `Buffer` or `TextDecoder`, which Hermes, the web and Jest do not all provide alike.

export interface IdTokenClaims {
  email: string | null;
  // The `hd` claim: the Google Workspace domain that the account belongs to. A Gmail account has none.
  hostedDomain: string | null;
  name: string | null;
}

export const SNU_DOMAIN = 'snu.ac.kr';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function refuse(): never {
  throw new Error('not an ID token');
}

// The bytes of a base64url text, each as "%XX". Padding may be written or left out.
function percentEncodedBytes(base64Url: string): string {
  const digits = base64Url.replace(/=+$/u, '');
  if (digits === '' || digits.length % 4 === 1) {
    refuse();
  }
  let bits = '';
  for (const character of digits) {
    const value = ALPHABET.indexOf(character);
    if (value === -1) {
      refuse();
    }
    bits += value.toString(2).padStart(6, '0');
  }
  let encoded = '';
  // The bits left over after the last whole byte are filling.
  for (let start = 0; start + 8 <= bits.length; start += 8) {
    encoded += `%${Number.parseInt(bits.slice(start, start + 8), 2)
      .toString(16)
      .padStart(2, '0')}`;
  }
  return encoded;
}

function claimsOf(idToken: string): object {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    refuse();
  }
  try {
    // `decodeURIComponent` reads the bytes as UTF-8, so a Korean name survives, and refuses bytes that are not.
    const claims: unknown = JSON.parse(decodeURIComponent(percentEncodedBytes(parts[1] ?? '')));
    if (typeof claims === 'object' && claims !== null && !Array.isArray(claims)) {
      return claims;
    }
  } catch {
    // Refused below, as claims of another shape are.
  }
  return refuse();
}

function text(claims: object, name: string): string | null {
  const value: unknown = Reflect.get(claims, name);
  return typeof value === 'string' ? value : null;
}

// Throws when the token cannot be read.
export function readIdToken(idToken: string): IdTokenClaims {
  const claims = claimsOf(idToken);
  return { email: text(claims, 'email'), hostedDomain: text(claims, 'hd'), name: text(claims, 'name') };
}

// An SNU account carries `hd=snu.ac.kr`. The address alone does not make one.
export function isSnuAccount(claims: IdTokenClaims): boolean {
  return claims.hostedDomain === SNU_DOMAIN;
}
