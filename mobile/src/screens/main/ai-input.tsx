/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { USER_MESSAGE_MAX } from '@/api/assistant-types';
import { color, Icon, radius, shadow, space, text } from '@/design-system';
import { AI_INPUT } from './layout';

interface AiInputProps {
  // Whether the chat is open: the bar is its input then, and its border is the focus ring.
  chatOpen: boolean;
  // Focusing the bar opens the chat.
  onOpen: () => void;
  // Nothing is sent while the Assistant works on the message before.
  waiting: boolean;
  onSend: (text: string) => void;
  // The field's height, from 40 to 120, so that the chat keeps its last bubble clear of the bar.
  onHeight: (height: number) => void;
}

// The field's height for one line, and the most it grows to before it scrolls.
export const AI_FIELD = 40;
const FIELD_MAX = 120;
// Above and below the text.
const FIELD_PADDING = space[2];

// The frame's: a bar of radius 28 around a field and a send button of 40, 22 once the field holds more than a line.
const BAR_RADIUS = 28;
const BAR_RADIUS_TALL = 22;

// The AI input of the `Main` frame: the white bar with the placeholder and the send button. Focusing it opens the
// chat, and it stays at the bottom as the chat's input. It grows with its text up to 120, takes at most the characters
// the Assistant takes in a message, Enter starts a new line, and only the send button sends, in the key colour while
// there is something to send.
export function AiInput({ chatOpen, onOpen, waiting, onSend, onHeight }: AiInputProps): ReactElement {
  const [message, setMessage] = useState('');
  const [height, setHeight] = useState(AI_FIELD);
  const canSend = message.trim() !== '' && !waiting;
  const grow = (next: number): void => {
    setHeight(next);
    onHeight(next);
  };
  const send = (): void => {
    onSend(message.trim());
    setMessage('');
    grow(AI_FIELD);
  };
  return (
    <View
      style={[styles.bar, chatOpen && styles.open, height > AI_FIELD && { borderRadius: BAR_RADIUS_TALL }]}
      testID="ai-input"
    >
      <TextInput
        accessibilityLabel="AI에게 메시지"
        maxLength={USER_MESSAGE_MAX}
        multiline
        onChangeText={setMessage}
        onContentSizeChange={({ nativeEvent }) => {
          grow(Math.max(AI_FIELD, Math.min(FIELD_MAX, nativeEvent.contentSize.height + 2 * FIELD_PADDING)));
        }}
        onFocus={onOpen}
        onPressIn={onOpen}
        placeholder="무엇이든 부탁해 보세요"
        placeholderTextColor={color.inkMuted}
        scrollEnabled={height >= FIELD_MAX}
        style={[styles.field, { height }]}
        submitBehavior="newline"
        value={message}
      />
      <Pressable
        accessibilityLabel="보내기"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        hitSlop={space[1]}
        onPress={send}
        style={[styles.send, canSend && styles.sendReady]}
      >
        <Icon color={canSend ? color.onPrimary : color.inkMuted} name="send" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    right: AI_INPUT.side,
    bottom: AI_INPUT.bottom,
    left: AI_INPUT.side,
    flexDirection: 'row',
    alignItems: 'flex-end',
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
  open: { borderColor: color.focusRing },
  field: {
    ...text.bodyLg,
    flex: 1,
    minWidth: 0,
    paddingVertical: FIELD_PADDING,
    color: color.ink,
    textAlignVertical: 'top',
  },
  send: {
    alignItems: 'center',
    justifyContent: 'center',
    width: AI_FIELD,
    height: AI_FIELD,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
  sendReady: { backgroundColor: color.snuBlue },
});
