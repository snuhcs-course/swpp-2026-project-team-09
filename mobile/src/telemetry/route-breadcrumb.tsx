/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useSegments } from 'expo-router';
import { useEffect } from 'react';
import { noteRoute } from './sentry';
import { noteScreen } from './usage';

// A route's pattern from expo-router's segments, which are the route files' names, so a parameter is its name and
// never its value: ["(signed-in)", "room", "[questId]"] is "/room/[questId]". Groups such as "(tabs)" are not part of
// an address and are left out.
export function routePattern(segments: readonly string[]): string {
  const named = segments.filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));
  return `/${named.join('/')}`;
}

// At each change of screen, in the root layout: leaves the crash reports' breadcrumb, which keeps the pattern as it is
// ("/room/[questId]"), and sends usage data's `screen_viewed`, whose route is scrubbed ("/room/:id").
export function RouteBreadcrumb(): null {
  const route = routePattern(useSegments());
  useEffect(() => {
    noteRoute(route);
    noteScreen(route);
  }, [route]);
  return null;
}
