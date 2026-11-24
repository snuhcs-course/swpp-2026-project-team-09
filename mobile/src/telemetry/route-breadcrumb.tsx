/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useSegments } from 'expo-router';
import { useEffect } from 'react';
import { noteRoute } from './sentry';

// A route's pattern from expo-router's segments, which are the route files' names, so a parameter is its name and
// never its value: ["(signed-in)", "room", "[questId]"] is "/room/[questId]". Groups such as "(tabs)" are not part of
// an address and are left out.
export function routePattern(segments: readonly string[]): string {
  const named = segments.filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));
  return `/${named.join('/')}`;
}

// Leaves a breadcrumb at each change of screen, in the root layout.
export function RouteBreadcrumb(): null {
  const route = routePattern(useSegments());
  useEffect(() => {
    noteRoute(route);
  }, [route]);
  return null;
}
