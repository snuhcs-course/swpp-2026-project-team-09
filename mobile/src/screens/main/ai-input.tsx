/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { USER_MESSAGE_MAX } from '@/api/assistant-types';
import { color, Icon, radius, shadow, space, text } from '@/design-system';
import type { Restore } from '@/features/assistant/restore';
import { AI_INPUT } from './layout';

// A message sent while a reply is on its way takes that question back (`useChat`'s `send`), so the input never waits.
interface AiInputProps {
  onSend: (text: string) => void;
  // How much higher than its place the bar stands: over the keyboard while it is up, 0 while it is down.
  lift: number;
  // The bar's height, 50 for a line, so that the answer frame's card keeps its content clear of the bar.
  onHeight: (height: number) => void;
  // In place of "무엇이든 부탁해 보세요".
  placeholder?: string;
  // The words of a message that failed, while that failure is the last thing said.
  restore?: Restore | null;
  // "이전 답" at the bar's left, which shows the hidden answer frame again; null or left out for none.
  onEarlier?: (() => void) | null;
  // A reply arrived while the frame was hidden: a dot on "이전 답" until the frame is shown.
  unseen?: boolean;
}

// The field's height for one line, and the most it grows to before it scrolls.
export const AI_FIELD = 40;
const FIELD_MAX = 120;
// The dot of a reply not yet seen, at the icon's top right.
const UNSEEN = 10;
const UNSEEN_INSET = 6;
// Above and below the text.
const FIELD_PADDING = space[2];

// The frame's: a bar of radius 28 around a field and a send button of 40, 22 once the field holds more than a line.
// The bar is `AI_INPUT.height` high while it holds a line.
const BAR_RADIUS = 28;
const BAR_RADIUS_TALL = 22;

// The bar's height from its own layout, whole: a change under 1 is no change. What it sets, the corners and the room
// the answer frame's card keeps, does not change it.
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

// The field's words. A failed message's words go into the empty field once per failure, and out again, if still as
// they were put, once that failure is no longer the last thing said (다시 시도 sent them again, or the conversation
// was forgotten). What the User wrote meanwhile stays.
function useMessage(restore: Restore | null): [string, (message: string) => void] {
  const [message, setMessage] = useState(restore?.words ?? '');
  const [put, setPut] = useState(restore);
  if (restore?.id !== put?.id) {
    setPut(restore);
    const kept = put !== null && message === put.words ? '' : message;
    setMessage(restore !== null && kept === '' ? restore.words : kept);
  }
  return [message, setMessage];
}

function EarlierButton({ onPress, unseen }: { onPress: () => void; unseen: boolean }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={unseen ? '이전 답, 새 답 있음' : '이전 답'}
      accessibilityRole="button"
      hitSlop={space[1]}
      onPress={onPress}
      style={styles.send}
    >
      <Icon color={color.ink} name="history" size={18} />
      {unseen ? <View style={styles.unseen} testID="earlier-unseen" /> : null}
    </Pressable>
  );
}

// The AI input of the `Main` frame: the white bar with the placeholder and the send button. It grows with its text up
// to 120, takes at most the characters the Assistant takes in a message, Enter starts a new line, and only the send
// button sends, in the key colour while there is something to send. The field grows by itself, between its least and
// its most height: nothing sets its height from its content, which would lay it out again and could swing it between
// two heights. "이전 답", when given, stands at the left as the send button does at the right.
export function AiInput(props: AiInputProps): ReactElement {
  const {
    onSend,
    lift,
    onHeight,
    placeholder = '무엇이든 부탁해 보세요',
    restore,
    onEarlier = null,
    unseen = false,
  } = props;
  const [message, setMessage] = useMessage(restore ?? null);
  const [height, laidOut] = useBarHeight(onHeight);
  const canSend = message.trim() !== '';
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
        height > AI_INPUT.height && { borderRadius: BAR_RADIUS_TALL },
        onEarlier !== null && styles.barEarlier,
      ]}
      testID="ai-input"
    >
      {onEarlier === null ? null : <EarlierButton onPress={onEarlier} unseen={unseen} />}
      <TextInput
        accessibilityLabel="AI에게 메시지"
        maxLength={USER_MESSAGE_MAX}
        multiline
        onChangeText={setMessage}
        placeholder={placeholder}
        placeholderTextColor={color.inkMuted}
        style={styles.field}
        submitBehavior="newline"
        value={message}
      />
      <SendButton canSend={canSend} onPress={send} />
    </View>
  );
}

function SendButton({ canSend, onPress }: { canSend: boolean; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="보내기"
      accessibilityRole="button"
      accessibilityState={{ disabled: !canSend }}
      disabled={!canSend}
      hitSlop={space[1]}
      onPress={onPress}
      style={[styles.send, canSend && styles.sendReady]}
    >
      <Icon color={canSend ? color.onPrimary : color.inkMuted} name="send" size={18} />
    </Pressable>
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
  barEarlier: { paddingLeft: space[1] },
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
  unseen: {
    position: 'absolute',
    top: UNSEEN_INSET,
    right: UNSEEN_INSET,
    width: UNSEEN,
    height: UNSEEN,
    borderRadius: UNSEEN / 2,
    borderWidth: 2,
    borderColor: color.surface,
    backgroundColor: color.danger,
  },
});
