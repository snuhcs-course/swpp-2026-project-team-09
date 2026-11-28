/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

// The tallest the page has been, which it keeps as its least height: rows that leave, as 참여 방식 and 게시판 under 비공개,
// then leave blank room under the page instead of pulling it, and the scroll, back up (P06 ticket 66).
export function useKeptHeight(): { minHeight: number; onLayout: (event: LayoutChangeEvent) => void } {
  const [minHeight, setMinHeight] = useState(0);
  return {
    minHeight,
    onLayout: ({ nativeEvent }) => {
      const { height } = nativeEvent.layout;
      setMinHeight((kept) => Math.max(kept, height));
    },
  };
}
