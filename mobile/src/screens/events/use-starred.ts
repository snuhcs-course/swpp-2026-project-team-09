/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo, useState } from 'react';
import type { GlobalEvent } from '@/api/types';
import { isStarred } from '@/features/events/adapter';

export interface Starred {
  on: boolean;
  turn: () => void;
  // The events the list holds while the ☆ is on, null while it is off.
  kept: ReadonlySet<string> | null;
}

// The 행사 tab's ☆, which shows the starred events alone (P06 tickets 57 and 59). It is off on a fresh start and stays as
// it was while the app runs, the tab staying mounted. While it is on, an event the User unstars, in its row or in its
// sheet, leaves the list at once (the user, 2026-11-28).
export function useStarred(events: readonly GlobalEvent[] | undefined): Starred {
  const [on, setOn] = useState(false);
  const starred = useMemo(
    () => new Set((events ?? []).filter((event) => isStarred(event)).map(({ id }) => id)),
    [events],
  );
  return {
    on,
    turn: () => {
      setOn((was) => !was);
    },
    kept: on ? starred : null,
  };
}
