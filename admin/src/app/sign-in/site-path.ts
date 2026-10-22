/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Only a path of this site is followed after signing in; anything else leads to the home page.
export function sitePath(next: FormDataEntryValue | null): string {
  if (typeof next !== 'string' || !next.startsWith('/')) {
    return '/';
  }
  const base = 'http://admin.invalid';
  const url = new URL(next, base);
  return url.origin === base ? `${url.pathname}${url.search}` : '/';
}
