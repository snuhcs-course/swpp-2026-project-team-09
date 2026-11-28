/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalEvent } from '@/api/types';
import { isStarred } from '@/features/events/adapter';

export interface Starred {
  on: boolean;
  turn: () => void;
  // The events the list holds while the ☆ is on, null while it is off.
  kept: ReadonlySet<string> | null;
}

// The 행사 tab's ☆, which shows the starred events alone (P06 ticket 57). It is off on a fresh start and stays as it was
// while the app runs, the tab staying mounted. While it is on, an event the User unstars keeps its row until the tab is
// left or the ☆ turned off and on, so that a wrong press is undone where it was made.
export function useStarred(events: readonly GlobalEvent[] | undefined): Starred {
  const [on, setOn] = useState(false);
  const focused = useIsFocused();
  const starred = useMemo(
    () => new Set((events ?? []).filter((event) => isStarred(event)).map(({ id }) => id)),
    [events],
  );
  const latest = useRef(starred);
  const [held, setHeld] = useState<ReadonlySet<string>>(starred);
  useEffect(() => {
    latest.current = starred;
  });
  useEffect(() => {
    if (on && focused) {
      setHeld(new Set(latest.current));
    }
  }, [on, focused]);
  const kept = useMemo(() => (on ? new Set([...held, ...starred]) : null), [on, held, starred]);
  return {
    on,
    turn: () => {
      setOn((was) => !was);
    },
    kept,
  };
}
