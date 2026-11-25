/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, font, radius, space, text } from '@/design-system';
import { type HintName, hintSeen, keepHintSeen } from '@/storage/sheet-hint';

// The answer sheet's first-time hint (P04 ticket 61, boards u1 and u2): one translucent line over the grip, with no
// button, while the card stands low with more to show. It leaves after a few seconds or at the first touch of the card,
// and shows once a phone. Picking people in the time card has its own, under the card (P04 ticket 64, board p2).

export const SHEET_HINT = '손잡이를 올리면 더 볼 수 있어요';
export const PICK_HINT = '지도의 얼굴을 눌러도 골라져요';
const HINT_MS = 4000;
// Over the card's top edge.
const GAP = space[2] + 2;

type Kept = 'reading' | 'unseen' | 'seen';

export function useSheetHint(canShow: boolean): { shown: boolean; leave: () => void } {
  return useHintOnce('sheet', canShow);
}

function useHintOnce(name: HintName, canShow: boolean): { shown: boolean; leave: () => void } {
  const [kept, setKept] = useState<Kept>('reading');
  const [left, setLeft] = useState(false);
  useEffect(() => {
    let live = true;
    void hintSeen(name).then((seen): void => {
      if (live) {
        setKept(seen ? 'seen' : 'unseen');
      }
    });
    return (): void => {
      live = false;
    };
  }, [name]);
  const shown = canShow && kept === 'unseen' && !left;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (shown) {
      void keepHintSeen(name);
      timer = setTimeout(() => {
        setLeft(true);
      }, HINT_MS);
    }
    return (): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [name, shown]);
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

// Under the time card while people are picked in it, when there are Friends to pick (`friends`).
export function PickHint({ friends }: { friends: boolean }): ReactElement | null {
  const { shown } = useHintOnce('pick', friends);
  return shown ? (
    <Text style={[styles.hint, styles.under]} testID="pick-hint">
      {PICK_HINT}
    </Text>
  ) : null;
}

const styles = StyleSheet.create({
  under: { top: '100%', marginTop: space[3] },
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
