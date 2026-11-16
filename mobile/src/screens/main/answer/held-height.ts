/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RefObject, useEffect, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';

// The card's content keeps the height it last had while `hold`, such as while a reply is on its way, so that the dots
// stand where the reply will and the card does not shrink and grow again. Holding starts at the content's top, where
// the new question stands, however far the reply before was scrolled.
export function useHeldHeight(hold: boolean): {
  minHeight: number | undefined;
  onContentSizeChange: (width: number, height: number) => void;
  scroll: RefObject<ScrollView | null>;
} {
  const [last, setLast] = useState(0);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (hold) {
      scroll.current?.scrollTo({ y: 0, animated: false });
    }
  }, [hold]);
  return {
    scroll,
    minHeight: hold && last > 0 ? last : undefined,
    onContentSizeChange: (_width, height) => {
      if (!hold) {
        setLast(height);
      }
    },
  };
}
