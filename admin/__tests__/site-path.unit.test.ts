/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The path followed after signing in: open-redirect variants, values that are no path, and paths of the site. Expected
// from admin's README (The session): `next` is followed when it is a path of this site, else the home page opens.

import { sitePath } from '@/app/sign-in/site-path';

// The admin site's address in Production (admin's README), against which a browser reads the path it is sent to.
const SITE = 'https://admin.snunow.com';

const ELSEWHERE: [string, FormDataEntryValue | null][] = [
  ['an absolute URL', 'https://elsewhere.example/administrators'],
  ['a javascript: URL', 'javascript:alert(1)'],
  ['//host', '//elsewhere.example/administrators'],
  ['/\\host', '/\\elsewhere.example/administrators'],
  // A browser drops tabs and newlines from a URL, which turns these into //host.
  ['a tab inside the path', '/\t/elsewhere.example'],
  ['a newline inside the path', '/\n/elsewhere.example'],
  // The URL parser removes dot segments, which turns these into //host too.
  ['a dot segment before //host', '/.//elsewhere.example'],
  ['a dot-dot segment before //host', '/..//elsewhere.example'],
  ['an encoded dot-dot segment before //host', '/%2e%2e//elsewhere.example'],
  ['a dot segment before \\\\host', '/.\\\\elsewhere.example'],
  ['a relative path', 'administrators'],
  ['the empty value', ''],
  ['no value', null],
  ['a file, not a string', new File(['/administrators'], 'next')],
];

const ENCODED: [string, string][] = [
  ['an encoded slash', '/%2F%2Felsewhere.example'],
  ['an encoded backslash', '/%5Celsewhere.example'],
];

const OF_THE_SITE: [string, string][] = [
  ['the home page', '/'],
  ['a page', '/administrators'],
  ['a page with a query', '/users?search=kim'],
];

describe('The path followed after signing in', () => {
  it.each(ELSEWHERE)('%s → the home page', (_, next) => {
    expect(sitePath(next)).toBe('/');
  });

  it.each(ENCODED)('%s → kept encoded, a path of this site', (_, next) => {
    expect(sitePath(next)).toBe(next);
  });

  it.each(OF_THE_SITE)('%s → followed, with its query', (_, next) => {
    expect(sitePath(next)).toBe(next);
  });

  it.each([...ELSEWHERE, ...ENCODED, ...OF_THE_SITE])('%s → a browser stays on the admin site', (_, next) => {
    expect(new URL(sitePath(next), SITE).origin).toBe(SITE);
  });
});
