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
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
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
  // The answer's main button, at the bar's right on the same line; the bar gives it room.
  beside?: ReactNode;
  // Inside the answer's card or dock: a sunken field on its white, without the bar's own border and shadow.
  inCard?: boolean;
  // A change puts the focus in the field (P04 ticket 10); the first value does nothing.
  focusKey?: number;
  // Told each time the field becomes empty or not: the main map shows its suggestions only over an empty field.
  onEmpty?: (empty: boolean) => void;
}

// The field's height for one line, and the most it grows to before it scrolls.
export const AI_FIELD = 40;
const FIELD_MAX = 120;
// Above and below the text.
const FIELD_PADDING = space[2];
// A button of 48 in its touch area, in the middle of the bar of 50.
const BESIDE_LIFT = 1;

// The frame's: a bar of radius 28 around a field and a send button of 40, 22 once the field holds more than a line.
// The bar is `AI_INPUT.height` high while it holds a line.
const BAR_RADIUS = 28;
const BAR_RADIUS_TALL = 22;

// The bar's height from its own layout, whole: a change under 1 is no change. What it sets, the corners and the room
// the answer frame's card keeps, does not change it. The first layout is always told, so that a bar that comes back
// at one line after a card hid it does not leave the screen counting the taller bar before.
function useBarHeight(onHeight: (height: number) => void): [number, (event: LayoutChangeEvent) => void] {
  const [height, setHeight] = useState<number>(AI_INPUT.height);
  const told = useRef<number | null>(null);
  const laidOut = ({ nativeEvent }: LayoutChangeEvent): void => {
    const next = Math.round(nativeEvent.layout.height);
    if (told.current !== null && Math.abs(next - told.current) < 1) {
      return;
    }
    told.current = next;
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

// The field, which takes the focus each time `key` changes after its first value.
function useFocusOn(key: number): RefObject<TextInput | null> {
  const field = useRef<TextInput>(null);
  const first = useRef(key);
  useEffect(() => {
    if (key !== first.current) {
      field.current?.focus();
    }
  }, [key]);
  return field;
}

// The AI input of the `Main` frame: the white bar with the placeholder and the send button. It grows with its text up
// to 120, takes at most the characters the Assistant takes in a message, Enter starts a new line, and only the send
// button sends, in the key colour while there is something to send. The field grows by itself, between its least and
// its most height: nothing sets its height from its content, which would lay it out again and could swing it between
// two heights. The conversation kept while the answer is closed is the map screen's chip, not the input's (P04
// ticket 11).
interface FieldProps {
  message: string;
  onChange: (message: string) => void;
  placeholder: string;
  field: RefObject<TextInput | null>;
}

function Field(props: FieldProps): ReactElement {
  return (
    <TextInput
      ref={props.field}
      accessibilityLabel="AI에게 메시지"
      maxLength={USER_MESSAGE_MAX}
      multiline
      onChangeText={props.onChange}
      placeholder={props.placeholder}
      placeholderTextColor={color.inkMuted}
      style={styles.field}
      submitBehavior="newline"
      value={props.message}
    />
  );
}

// The answer's main button at the bar's right, which tells its width so that the bar gives it room.
function Beside({
  lift,
  onWidth,
  children,
}: {
  lift: number;
  onWidth: (width: number) => void;
  children: ReactNode;
}): ReactElement {
  return (
    <View
      onLayout={({ nativeEvent }) => {
        onWidth(Math.round(nativeEvent.layout.width));
      }}
      style={[styles.beside, { bottom: AI_INPUT.bottom + lift + BESIDE_LIFT }]}
      testID="ai-input-beside"
    >
      {children}
    </View>
  );
}

export function AiInput(props: AiInputProps): ReactElement {
  const {
    onSend,
    lift,
    onHeight,
    placeholder = '무엇이든 부탁해 보세요',
    restore,
    beside = null,
    inCard = false,
    focusKey = 0,
    onEmpty,
  } = props;
  const field = useFocusOn(focusKey);
  const [besideWidth, setBesideWidth] = useState(0);
  const [message, setMessage] = useMessage(restore ?? null);
  const empty = message === '';
  useEffect(() => {
    onEmpty?.(empty);
  }, [empty, onEmpty]);
  const [height, laidOut] = useBarHeight(onHeight);
  const canSend = message.trim() !== '';
  const send = (): void => {
    onSend(message.trim());
    setMessage('');
  };
  const room = beside === null ? 0 : besideWidth + space[2];
  return (
    <>
      <View
        onLayout={laidOut}
        style={[
          styles.bar,
          { bottom: AI_INPUT.bottom + lift, right: AI_INPUT.side + room },
          height > AI_INPUT.height && { borderRadius: BAR_RADIUS_TALL },
          inCard && styles.inCard,
        ]}
        testID="ai-input"
      >
        <Field field={field} message={message} onChange={setMessage} placeholder={placeholder} />
        <SendButton canSend={canSend} onPress={send} />
      </View>
      {beside === null ? null : (
        <Beside lift={lift} onWidth={setBesideWidth}>
          {beside}
        </Beside>
      )}
    </>
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
  inCard: { borderWidth: 0, backgroundColor: color.surfaceSunken, boxShadow: 'none' },
  beside: { position: 'absolute', right: AI_INPUT.side },
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
