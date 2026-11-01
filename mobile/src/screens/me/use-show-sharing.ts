/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RefObject, useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import { space } from '@/design-system';

// How long the 위치 공유 card stays outlined after the friend panel's "공유 설정".
const OUTLINE_MS = 1200;

// Scrolls to the 위치 공유 card while the address asks for it, and gives back that the card was shown after a while.
export function useShowSharing(
  show: boolean,
  onShown: () => void,
): { scroll: RefObject<ScrollView | null>; setTop: (top: number) => void } {
  const scroll = useRef<ScrollView>(null);
  const [top, setTop] = useState<number | null>(null);
  const shown = useEffectEvent(onShown);
  useEffect(() => {
    if (show && top !== null) {
      scroll.current?.scrollTo({ y: Math.max(0, top - space[3]) });
    }
  }, [show, top]);
  useEffect((): (() => void) | void => {
    if (!show) {
      return;
    }
    const timer = setTimeout(() => {
      shown();
    }, OUTLINE_MS);
    return (): void => {
      clearTimeout(timer);
    };
  }, [show]);
  return { scroll, setTop };
}
