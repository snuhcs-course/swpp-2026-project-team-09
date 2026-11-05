/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, TextInput, View } from 'react-native';
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
  // How much higher than its place the bar stands: over the keyboard while it is up, 0 while it is down.
  lift: number;
  // The bar's height, 50 for a line, so that the chat keeps its last bubble clear of the bar.
  onHeight: (height: number) => void;
  // The grey text of the empty field.
  placeholder?: string;
}

// The field's height for one line, and the most it grows to before it scrolls.
export const AI_FIELD = 40;
const FIELD_MAX = 120;
// Above and below the text.
const FIELD_PADDING = space[2];

// The frame's: a bar of radius 28 around a field and a send button of 40, 22 once the field holds more than a line.
// The bar is `AI_INPUT.height` high while it holds a line.
const BAR_RADIUS = 28;
const BAR_RADIUS_TALL = 22;

// The bar's height from its own layout, whole: a change under 1 is no change. What it sets, the corners and the room
// the chat keeps, does not change it.
function useBarHeight(onHeight: (height: number) => void): [number, (event: LayoutChangeEvent) => void] {
  const [height, setHeight] = useState<number>(AI_INPUT.height);
  const laidOut = ({ nativeEvent }: LayoutChangeEvent): void => {
    const next = Math.round(nativeEvent.layout.height);
    if (Math.abs(next - height) < 1) {
      return;
    }
    setHeight(next);
    onHeight(next);
  };
  return [height, laidOut];
}

// The AI input of the `Main` frame: the white bar with the placeholder and the send button. Focusing it opens the
// chat, and it stays at the bottom as the chat's input. It grows with its text up to 120, takes at most the characters
// the Assistant takes in a message, Enter starts a new line, and only the send button sends, in the key colour while
// there is something to send.
// The field grows by itself, between its least and its most height: nothing sets its height from its content, which
// would lay it out again and could swing it between two heights.
export function AiInput(props: AiInputProps): ReactElement {
  const { chatOpen, onOpen, waiting, onSend, lift, onHeight, placeholder = '무엇이든 부탁해 보세요' } = props;
  const [message, setMessage] = useState('');
  const [height, laidOut] = useBarHeight(onHeight);
  const canSend = message.trim() !== '' && !waiting;
  const send = (): void => {
    onSend(message.trim());
    setMessage('');
  };
  return (
    <View
      onLayout={laidOut}
      style={[
        styles.bar,
        { bottom: AI_INPUT.bottom + lift },
        chatOpen && styles.open,
        height > AI_INPUT.height && { borderRadius: BAR_RADIUS_TALL },
      ]}
      testID="ai-input"
    >
      <TextInput
        accessibilityLabel="AI에게 메시지"
        maxLength={USER_MESSAGE_MAX}
        multiline
        onChangeText={setMessage}
        onFocus={onOpen}
        onPressIn={onOpen}
        placeholder={placeholder}
        placeholderTextColor={color.inkMuted}
        style={styles.field}
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
    minHeight: AI_FIELD,
    maxHeight: FIELD_MAX,
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
