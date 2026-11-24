/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The routes whose request line carries no body (README.md: Logging), each because the app promises Users that what
// it carries is not kept: their positions and their Friends', a 학번 and a registered name, a timetable picture, and the
// conversation with the Assistant. Any method, with or without a trailing slash.
export const BODILESS_ROUTES: readonly { kind: string; path: RegExp }[] = [
  { kind: 'position', path: /^\/positions\/?$/u },
  // A walking route starts at the User's position.
  { kind: 'position', path: /^\/walking-route\/?$/u },
  { kind: 'profile', path: /^\/users\/me\/profile\/?$/u },
  // The lobby answers the profile too.
  { kind: 'profile', path: /^\/lobby\/?$/u },
  { kind: 'profile', path: /^\/library\/room-requests\/[^/]+\/companions\/?$/u },
  { kind: 'timetable picture', path: /^\/timetable\/readings\/?$/u },
  { kind: 'Assistant', path: /^\/assistant\/[^/]+\/?$/u },
];

// Whether a request line keeps the bodies of a request to this path, its query string already left out.
export function keepsBodies(path: string): boolean {
  return !BODILESS_ROUTES.some((route) => route.path.test(path));
}
