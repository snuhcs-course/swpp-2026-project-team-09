/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';

// The card's content keeps the height it last had while `hold`, such as while a reply is on its way, so that the dots
// stand where the reply will and the card does not shrink and grow again. Holding starts at the content's top, where
// the new question stands, however far the reply before was scrolled.
// The content goes back to its top each time `top` turns true, such as when a Place starts to be picked on the map: the
// picking line and its chip then stand first in the content (PR 545's review), where the low card shows them.
export function useTopWhen(top: boolean, scroll: { current: Pick<ScrollView, 'scrollTo'> | null }): void {
  useEffect(() => {
    if (top) {
      scroll.current?.scrollTo({ y: 0, animated: true });
    }
  }, [top, scroll]);
}

// A layer over the content (`layer`, its id, null with none), such as a restaurant's menu over the list of candidates,
// opens at its top, and closing it brings the content back to where it was scrolled when the layer opened: the row that
// was pressed in sight (P04 ticket 78). Another layer over it starts at its top too. Another answer (`of`) keeps the
// place of none: it starts where a new answer does.
export function useLayerScroll(
  layer: string | null,
  of: object | null,
  scroll: { current: Pick<ScrollView, 'scrollTo'> | null },
  scrollY: { value: number },
): void {
  const was = useRef(layer);
  const kept = useRef<{ of: object | null; y: number } | null>(null);
  useEffect(() => {
    const before = was.current;
    was.current = layer;
    if (layer === before) {
      return;
    }
    if (layer === null) {
      const under = kept.current;
      kept.current = null;
      if (under !== null && under.of === of) {
        scroll.current?.scrollTo({ y: under.y, animated: false });
      }
      return;
    }
    if (before === null) {
      kept.current = { of, y: scrollY.value };
    }
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [layer, of, scroll, scrollY]);
}

export function useHeldHeight(
  hold: boolean,
  scroll: { current: Pick<ScrollView, 'scrollTo'> | null },
): {
  minHeight: number | undefined;
  onContentSizeChange: (width: number, height: number) => void;
} {
  const [last, setLast] = useState(0);
  useEffect(() => {
    if (hold) {
      scroll.current?.scrollTo({ y: 0, animated: false });
    }
  }, [hold, scroll]);
  return {
    minHeight: hold && last > 0 ? last : undefined,
    onContentSizeChange: (_width, height) => {
      if (!hold) {
        setLast(height);
      }
    },
  };
}
