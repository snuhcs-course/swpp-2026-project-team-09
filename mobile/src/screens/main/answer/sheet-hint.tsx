/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, font, radius, space, text } from '@/design-system';
import { keepSheetHintSeen, sheetHintSeen } from '@/storage/sheet-hint';

// The answer sheet's first-time hint (P04 ticket 61, boards u1 and u2): one translucent line over the grip, with no
// button, while the card stands low with more to show. It leaves after a few seconds or at the first touch of the card,
// and shows once a phone.

export const SHEET_HINT = '손잡이를 올리면 더 볼 수 있어요';
const HINT_MS = 4000;
// Over the card's top edge.
const GAP = space[2] + 2;

type Kept = 'reading' | 'unseen' | 'seen';

export function useSheetHint(canShow: boolean): { shown: boolean; leave: () => void } {
  const [kept, setKept] = useState<Kept>('reading');
  const [left, setLeft] = useState(false);
  useEffect(() => {
    let live = true;
    void sheetHintSeen().then((seen): void => {
      if (live) {
        setKept(seen ? 'seen' : 'unseen');
      }
    });
    return (): void => {
      live = false;
    };
  }, []);
  const shown = canShow && kept === 'unseen' && !left;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (shown) {
      void keepSheetHintSeen();
      timer = setTimeout(() => {
        setLeft(true);
      }, HINT_MS);
    }
    return (): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [shown]);
  const leave = useCallback((): void => {
    setLeft(true);
  }, []);
  return { shown, leave };
}

// `bottom`: the low card's whole height, from the screen's bottom.
export function SheetHint({ bottom }: { bottom: number }): ReactElement {
  return (
    <Text style={[styles.hint, { bottom: bottom + GAP }]} testID="answer-sheet-hint">
      {SHEET_HINT}
    </Text>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...text.label,
    position: 'absolute',
    alignSelf: 'center',
    pointerEvents: 'none',
    overflow: 'hidden',
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 19, 48, 0.62)',
    fontFamily: font.semiBold,
    color: color.surface,
  },
});
