/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';

// The card's content keeps the height it last had while `hold`, such as while a reply is on its way, so that the dots
// stand where the reply will and the card does not shrink and grow again.
export function useHeldHeight(hold: boolean): {
  minHeight: number | undefined;
  onContentSizeChange: (width: number, height: number) => void;
} {
  const [last, setLast] = useState(0);
  return {
    minHeight: hold && last > 0 ? last : undefined,
    onContentSizeChange: (_width, height) => {
      if (!hold) {
        setLast(height);
      }
    },
  };
}
