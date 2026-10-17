/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { color, Icon, radius, shadow, space, text } from '@/design-system';
import { AI_INPUT } from './layout';

// The AI input of the `Main` frame: the white bar with the placeholder and the send button. It is a field, and
// focusing it opens the chat, whose own input takes the focus and the typing; so this one stays empty, and its send
// button is disabled. Speech input and autocomplete would attach here.
export function AiInput({ onOpen }: { onOpen: () => void }): ReactElement {
  return (
    <View style={styles.bar} testID="ai-input">
      <TextInput
        accessibilityLabel="AI에게 메시지"
        onFocus={onOpen}
        onPressIn={onOpen}
        placeholder="무엇이든 부탁해 보세요"
        placeholderTextColor={color.inkMuted}
        showSoftInputOnFocus={false}
        style={styles.field}
        value=""
      />
      <Pressable
        accessibilityLabel="보내기"
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        hitSlop={space[1]}
        style={styles.send}
      >
        <Icon color={color.inkMuted} name="send" size={18} />
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
  field: { ...text.bodyLg, flex: 1, minWidth: 0, height: FIELD, paddingVertical: 0, color: color.ink },
  send: {
    alignItems: 'center',
    justifyContent: 'center',
    width: FIELD,
    height: FIELD,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
});
