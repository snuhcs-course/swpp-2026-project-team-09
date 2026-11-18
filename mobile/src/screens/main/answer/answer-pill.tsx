/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, Icon, radius, shadow, space, text } from '@/design-system';
import { ANSWER_PILL, listsTop } from '../layout';
import { CloseButton } from './close-button';

interface AnswerPillProps {
  asked: string;
  icon: 'chat' | 'user' | 'pin';
  onClose: () => void;
  onNew: () => void;
  keyboardUp: boolean;
}

// While the keyboard is up, a press on the pill beside ✕ only puts the keyboard down, as one on the scrim under the
// frame does. ✕ stands deeper, so it keeps its press.
function keyboardDownOn(keyboardUp: boolean): Partial<ViewProps> {
  return keyboardUp
    ? {
        onStartShouldSetResponder: () => true,
        onResponderGrant: () => {
          Keyboard.dismiss();
        },
      }
    : {};
}

// What the User asked, on one line, with its icon and ✕, which hides the frame; or a building asked about over the
// answer ("여기면 어때?"), with the pin. "새 대화" at its right forgets the conversation.
export function AnswerPill({ asked, icon, onClose, onNew, keyboardUp }: AnswerPillProps): ReactElement {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.pillRow, { top: listsTop(top) }]}>
      <View {...keyboardDownOn(keyboardUp)} style={styles.pill} testID="answer-pill">
        <Icon color={color.ink} name={icon} size={20} testID={`answer-pill-${icon}`} />
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.asked}>
          {asked}
        </Text>
        <CloseButton label="답 닫기" onPress={onClose} />
      </View>
      <Pressable
        accessibilityLabel="새 대화"
        accessibilityRole="button"
        onPress={onNew}
        style={({ pressed }) => [styles.new, pressed && styles.pressed]}
      >
        <Icon color={color.ink} name="chatPlus" size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    position: 'absolute',
    right: ANSWER_PILL.side,
    left: ANSWER_PILL.side,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    pointerEvents: 'box-none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: space[2],
    height: ANSWER_PILL.height,
    paddingLeft: space[4],
    paddingRight: space[1],
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  asked: { ...text.label, flexShrink: 1, color: color.ink },
  new: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ANSWER_PILL.height,
    height: ANSWER_PILL.height,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  pressed: { opacity: 0.85 },
});
