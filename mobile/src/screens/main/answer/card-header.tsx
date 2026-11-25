/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { type AccessibilityActionInfo, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, Icon, radius, size, space, text } from '@/design-system';
import type { Level } from './card-levels';
import { type FrameCardProps, OPEN_EDGE } from './frame-card-parts';
import type { Raising } from './raise-handle';

// The bottom sheet's header (P04 ticket 52), the same in every state: the grip at the top centre and one row under it,
// the history chip, "＋ 새 대화", and ✕. Nothing in it is pressed to raise or lower the card: a drag on the card moves
// it, and the grip gives screen readers the steps. The grip's zone is the grip and an even room over and under it: the
// room of the label it had went with the label (the user's phone check).

export const CLOSE_ANSWER_LABEL = '답 닫기';
export const ASK_NEW_LABEL = '새 대화';
export const GRIP_LABEL = '답 카드 높이';

// ✕'s circle, as wide as the stop button's (`RoundButton`).
const MARK = 36;
// The grip and the room around it, together one unit over the row.
const GRIP_TOP = 6;
const GRIP_HEIGHT = 4;
const GRIP_ZONE = GRIP_TOP + GRIP_HEIGHT + GRIP_TOP;
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

// The steps a screen reader takes the card through (`steps`, those of different heights), as a drag does: up a step,
// down a step, and close (P04 ticket 63). Only the steps that can act now are offered (PR 516's review).
function actionsOf(raising: Raising, steps: readonly Level[]): AccessibilityActionInfo[] {
  const { level, close } = raising;
  const at = Math.max(0, steps.indexOf(level));
  return [
    ...(at < steps.length - 1 ? [{ name: 'increment', label: '답 크게 보기' }] : []),
    ...(at > 0 ? [{ name: 'decrement', label: '답 작게 보기' }] : []),
    ...(close === undefined ? [] : [{ name: 'close', label: CLOSE_ANSWER_LABEL }]),
  ];
}

function adjust(raising: Raising, steps: readonly Level[], action: string): void {
  const { level, setLevel, close } = raising;
  const at = Math.max(0, steps.indexOf(level));
  const up = steps[at + 1];
  const down = steps[at - 1];
  if (action === 'increment' && up !== undefined) {
    setLevel(up);
  } else if (action === 'decrement' && down !== undefined) {
    setLevel(down);
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

// The header, which stays while the content scrolls under it, and a hairline under its row that parts the two, as
// comment sheets do (the user's phone check): only over a content that shows something. The line lies over the header's
// room under the row and takes none of its own, so that drawing it never changes the header's height, which the steps
// are measured against.
export function CardTop(p: {
  props: Pick<FrameCardProps, 'raising' | 'onClose' | 'onAskNew' | 'chip' | 'testID'>;
  steps: readonly Level[];
  ruled: boolean;
  onHeight: (height: number) => void;
}): ReactElement {
  const { raising = null, onClose = null, onAskNew = null, chip = null } = p.props;
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        p.onHeight(nativeEvent.layout.height);
      }}
      style={styles.top}
    >
      <CardHeader chip={chip} onAskNew={onAskNew} onClose={onClose} raising={raising} steps={p.steps} />
      {p.ruled ? <View style={styles.rule} testID={`${p.props.testID}-rule`} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingBottom: space[2] },
  rule: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.border,
  },
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
