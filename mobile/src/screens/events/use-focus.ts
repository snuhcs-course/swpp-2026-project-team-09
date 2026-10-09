/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type RefObject, useEffect, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';

// How long a card opened from elsewhere stays marked.
const FOCUS_MS = 2600;

export interface Focus {
  focused: string | null;
  scroll: RefObject<ScrollView | null>;
  onCardAt: (id: string, y: number) => void;
}

// A card opened from elsewhere, by the tab's address: once the list is there, it shows every event, scrolls to the
// card and marks it for a moment.
export function useFocus(
  focus: string | undefined,
  loaded: boolean,
  onFocused: () => void,
  showAll: () => void,
): Focus {
  // A new object each time, so that the same event marked again is marked for the whole time again.
  const [focused, setFocused] = useState<{ id: string } | null>(null);
  const scroll = useRef<ScrollView>(null);
  const places = useRef(new Map<string, number>());
  useEffect(() => {
    if (focus === undefined || !loaded) {
      return;
    }
    showAll();
    setFocused({ id: focus });
    onFocused();
    const y = places.current.get(focus);
    if (y !== undefined) {
      scroll.current?.scrollTo({ y, animated: true });
    }
  }, [focus, loaded, onFocused, showAll]);
  useEffect((): (() => void) | void => {
    if (focused === null) {
      return;
    }
    const timer = setTimeout(() => {
      setFocused(null);
    }, FOCUS_MS);
    return (): void => {
      clearTimeout(timer);
    };
  }, [focused]);
  return {
    focused: focused?.id ?? null,
    scroll,
    onCardAt: (id, y) => {
      places.current.set(id, y);
      if (id === focused?.id) {
        scroll.current?.scrollTo({ y, animated: true });
      }
    },
  };
}
