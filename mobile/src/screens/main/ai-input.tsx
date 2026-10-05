import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, Icon, radius, shadow, space, text, useNotReadyToast } from '@/design-system';
import { AI_INPUT } from './layout';

// The AI input of the `Main` frame, as it looks while it is empty: the white bar with the placeholder and the grey
// send button. It is not a text field. The chat it opens belongs to another task, and a field that takes the focus
// brings the keyboard up over the map and, on Android, changes the screen's size as it leaves. So the bar is a
// button that says that the chat is not ready, and so does a press on the send button, which a screen reader reads
// as disabled. The field itself comes with the chat.
export function AiInput(): ReactElement {
  const showNotReady = useNotReadyToast();
  return (
    <View style={styles.bar} testID="ai-input">
      <Pressable
        accessibilityLabel="AI에게 메시지"
        accessibilityRole="button"
        onPress={showNotReady}
        style={styles.field}
      >
        <Text numberOfLines={1} style={styles.placeholder}>
          무엇이든 부탁해 보세요
        </Text>
      </Pressable>
      {/* The web's Pressable says "disabled" only for one that takes no press, so the press is taken by the box and
          the button inside it is what a screen reader reads. */}
      <Pressable accessible={false} hitSlop={space[1]} onPress={showNotReady} tabIndex={-1}>
        <View
          accessibilityLabel="보내기"
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessible
          aria-disabled
          style={styles.send}
        >
          <Icon color={color.inkMuted} name="send" size={18} />
        </View>
      </Pressable>
    </View>
  );
}

// The frame's: a bar of radius 28 around a field and a send button of 40.
const BAR_RADIUS = 28;
const FIELD = 40;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    right: AI_INPUT.side,
    bottom: AI_INPUT.bottom,
    left: AI_INPUT.side,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[1],
    paddingRight: space[1],
    paddingLeft: space[4],
    borderRadius: BAR_RADIUS,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  field: { flex: 1, justifyContent: 'center', minWidth: 0, height: FIELD },
  placeholder: { ...text.bodyLg, color: color.inkMuted },
  send: {
    alignItems: 'center',
    justifyContent: 'center',
    width: FIELD,
    height: FIELD,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
});
