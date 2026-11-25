/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

interface FoldedHeight {
  // The card's folded height, 0 until its band and its strip are laid out.
  height: number;
  onBand: (event: LayoutChangeEvent) => void;
  onStrip: (event: LayoutChangeEvent) => void;
}

// The time card's folded height, which it tells (`onHeight`) and which the answer sheet's high is measured from: the
// bottom of its band, its top padding included, then the gap and its grip's strip, each as laid out. Neither moves
// while the rows open, fold, or follow the sheet, so the height is right whatever the rows' room stands at. It used to
// be the card's whole height less React's `rows`, which came out short when the sheet had already shut the rows on the
// UI thread while React still held them open, and no later layout told it again: the sheet's high then went over the
// card (the user's phone, 2026-11-26).
export function useFoldedHeight(stripTop: number, onHeight: (height: number) => void): FoldedHeight {
  const [band, setBand] = useState(0);
  const [strip, setStrip] = useState(0);
  const height = band > 0 && strip > 0 ? band + stripTop + strip : 0;
  useEffect(() => {
    if (height > 0) {
      onHeight(height);
    }
  }, [height, onHeight]);
  return {
    height,
    onBand: ({ nativeEvent: { layout } }: LayoutChangeEvent): void => {
      setBand(layout.y + layout.height);
    },
    onStrip: ({ nativeEvent: { layout } }: LayoutChangeEvent): void => {
      setStrip(layout.height);
    },
  };
}
