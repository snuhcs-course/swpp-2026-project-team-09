/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { type AccessibilityActionInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, Icon, radius, size, space, text } from '@/design-system';
import type { Level } from './card-levels';
import { OPEN_EDGE } from './frame-card-parts';
import type { Raising } from './raise-handle';

// The bottom sheet's header (P04 ticket 52), the same in every state: the grip at the top centre and one row under it,
// the history chip, "＋ 새 대화", and ✕. Nothing in it is pressed to raise or lower the card: a drag on the card moves
// it, and the grip gives screen readers the steps. The grip's zone keeps the room the label under it had, as the boards
// of P04 ticket 61 keep it.

export const CLOSE_ANSWER_LABEL = '답 닫기';
export const ASK_NEW_LABEL = '새 대화';
export const GRIP_LABEL = '답 카드 높이';

// ✕'s circle, as wide as the stop button's (`RoundButton`).
const MARK = 36;
// The grip and the room under it, together one unit over the row.
const GRIP_TOP = 6;
const GRIP_HEIGHT = 4;
const LABEL_GAP = 2;
const UNDER_LABEL = 4;
const GRIP_ZONE = GRIP_TOP + GRIP_HEIGHT + LABEL_GAP + text.caption.lineHeight + UNDER_LABEL;
// The whole header's height, with or without a label.
export const HEADER_HEIGHT = GRIP_ZONE + MARK;

// The look the history chip and "＋ 새 대화" share: as high as ✕'s circle, so that the row's three shapes are one height
// (the user's phone test), and a press area of the least touch size around it.
export const CHIP_HEIGHT = MARK;
const CHIP_REACH = (size.touchMin - CHIP_HEIGHT) / 2;
export const CHIP_SLOP = { top: CHIP_REACH, bottom: CHIP_REACH };
export const chipLook = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: CHIP_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
  words: { ...text.label, color: color.inkMuted },
  pressed: { opacity: 0.6 },
});

// The steps a screen reader takes the card through (`steps`, those of different heights): up a step; down a step, or,
// at low, the layer over the card taken away (the earlier questions, a mark's card, a menu); and close. Only the steps
// that can act now are offered (PR 516's review).
function actionsOf(raising: Raising, steps: readonly Level[]): AccessibilityActionInfo[] {
  const { level, close, layer = null } = raising;
  const at = Math.max(0, steps.indexOf(level));
  return [
    ...(at < steps.length - 1 ? [{ name: 'increment', label: '답 크게 보기' }] : []),
    ...(at > 0 || layer !== null ? [{ name: 'decrement', label: '답 작게 보기' }] : []),
    ...(close === undefined ? [] : [{ name: 'close', label: CLOSE_ANSWER_LABEL }]),
  ];
}

function adjust(raising: Raising, steps: readonly Level[], action: string): void {
  const { level, setLevel, close, layer = null } = raising;
  const at = Math.max(0, steps.indexOf(level));
  const up = steps[at + 1];
  const down = steps[at - 1];
  if (action === 'increment' && up !== undefined) {
    setLevel(up);
  } else if (action === 'decrement') {
    if (layer !== null) {
      layer();
    } else if (down !== undefined) {
      setLevel(down);
    }
  } else if (action === 'close') {
    close?.();
  }
}

const SAID: Record<Level, string> = { low: '작게', mid: '중간', high: '크게' };

// The grip, with no words under it (P04 ticket 61): a drag anywhere on the card moves it, and a screen reader steps it.
function Grip({ raising, steps }: { raising: Raising; steps: readonly Level[] }): ReactElement {
  const { level } = raising;
  return (
    <View
      accessibilityActions={actionsOf(raising, steps)}
      accessibilityLabel={GRIP_LABEL}
      accessibilityRole="adjustable"
      accessibilityState={{ expanded: level !== 'low' }}
      accessibilityValue={{ text: SAID[level] }}
      accessible
      collapsable={false}
      onAccessibilityAction={({ nativeEvent }) => {
        adjust(raising, steps, nativeEvent.actionName);
      }}
      style={styles.zone}
      testID="answer-card-handle"
    >
      <View style={styles.grip} />
    </View>
  );
}

function AskNew({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={ASK_NEW_LABEL}
      accessibilityRole="button"
      hitSlop={CHIP_SLOP}
      onPress={onPress}
      style={({ pressed }) => [chipLook.chip, styles.fixed, pressed && chipLook.pressed]}
      testID="answer-ask-new"
    >
      <Icon color={color.snuBlue} name="plus" size={14} />
      <Text numberOfLines={1} style={chipLook.words}>
        {ASK_NEW_LABEL}
      </Text>
    </Pressable>
  );
}

function CloseButton({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={CLOSE_ANSWER_LABEL}
      accessibilityRole="button"
      hitSlop={(size.touchMin - MARK) / 2}
      onPress={onPress}
      style={({ pressed }) => [styles.close, pressed && chipLook.pressed]}
      testID="answer-close"
    >
      <Icon color={color.ink} name="x" size={18} />
    </Pressable>
  );
}

interface CardHeaderProps {
  // The card's step; null for a card of one height, whose grip is left out.
  raising: Raising | null;
  // The steps of different heights the card has now.
  steps: readonly Level[];
  // The history chip, which takes the room left and cuts its question with "…"; null, none.
  chip: ReactNode;
  onAskNew: (() => void) | null;
  onClose: (() => void) | null;
}

export function CardHeader({ raising, steps, chip, onAskNew, onClose }: CardHeaderProps): ReactElement {
  return (
    <View style={styles.header} testID="answer-card-header">
      {raising === null ? <View style={styles.zone} /> : <Grip raising={raising} steps={steps} />}
      <View style={styles.row}>
        <View style={styles.chip}>{chip}</View>
        {onAskNew === null ? null : <AskNew onPress={onAskNew} />}
        {onClose === null ? null : <CloseButton onPress={onClose} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: HEADER_HEIGHT },
  zone: { alignItems: 'center', height: GRIP_ZONE, paddingTop: GRIP_TOP },
  grip: { width: 36, height: GRIP_HEIGHT, borderRadius: radius.full, backgroundColor: color.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], height: MARK, paddingHorizontal: OPEN_EDGE },
  chip: { flex: 1, flexDirection: 'row', minWidth: 0 },
  fixed: { flexShrink: 0 },
  close: {
    alignItems: 'center',
    justifyContent: 'center',
    width: MARK,
    height: MARK,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
});
