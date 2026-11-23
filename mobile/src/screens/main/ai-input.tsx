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
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { USER_MESSAGE_MAX } from '@/api/assistant-types';
import type { Mention } from '@/api/mention-types';
import { color, Icon, NOT_AUTOFILLED, radius, shadow, space, text } from '@/design-system';
import type { Restore } from '@/features/assistant/restore';
import { AI_INPUT } from './layout';
import { MentionList } from './mention-list';
import { type MentionFriend, type Mentions, useMentions } from './use-mentions';

// A message sent while a reply is on its way takes that question back (`useChat`'s `send`), so the input never waits.
interface AiInputProps {
  onSend: (text: string, mentions: Mention[]) => void;
  // How much higher than its place the bar stands: over the keyboard while it is up, 0 while it is down.
  lift: number;
  // The room the input takes above its place: the bar, 50 for a line, and the main button's row above it with its gap,
  // so that the answer frame's card and the camera keep clear of both.
  onHeight: (height: number) => void;
  // In place of "무엇이든 부탁해 보세요".
  placeholder?: string;
  // The words of a message that failed, while that failure is the last thing said.
  restore?: Restore | null;
  // The answer's main button, on its own full-width row above the bar (P04 ticket 50).
  beside?: ReactNode;
  // Inside the answer's card or dock: a sunken field on its white, without the bar's own border and shadow.
  inCard?: boolean;
  // A change puts the focus in the field, as "새 대화" does (P04 ticket 10); the first value does nothing.
  focusKey?: number;
  // Whether the field holds nothing but spaces, told at each change of it.
  onEmpty?: (empty: boolean) => void;
  // The User's Friends, whom "@" lists to mention; none without them.
  friends?: readonly MentionFriend[];
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
const NO_FRIENDS: readonly MentionFriend[] = [];

// The bar's height from its own layout, whole: a change under 1 is no change. What it sets, the corners and the room
// the answer frame's card keeps (`useToldRoom`), does not change it.
function useBarHeight(): [number, (event: LayoutChangeEvent) => void] {
  const [height, setHeight] = useState<number>(AI_INPUT.height);
  const laidOut = ({ nativeEvent }: LayoutChangeEvent): void => {
    const next = Math.round(nativeEvent.layout.height);
    setHeight((last) => (Math.abs(next - last) < 1 ? last : next));
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
  placeholder: string;
  field: RefObject<TextInput | null>;
  mention: Mentions;
}

// While a mention stands in the words, the field draws them as parts, the mentions in the Friend colour. While it is
// empty it is one line high (P04 ticket 50): its own hint, which a multiline field may wrap at a large font, shows its
// first line only, exactly where typed words and the cursor start, as the same field draws both. Only the height is
// held, never `numberOfLines`: on Android an unset `numberOfLines` falls back to `setLines(1)` (its `@ReactProp`
// default), which would keep a field with text at one line.
function Field(props: FieldProps): ReactElement {
  const { mention } = props;
  const empty = props.message === '' && !mention.shown;
  return (
    <TextInput
      {...NOT_AUTOFILLED}
      ref={props.field}
      accessibilityLabel="AI에게 메시지"
      maxLength={USER_MESSAGE_MAX}
      multiline
      onBlur={mention.onBlur}
      onChangeText={mention.onChangeText}
      onFocus={mention.onFocus}
      onSelectionChange={mention.onSelectionChange}
      placeholder={props.placeholder}
      placeholderTextColor={color.inkMuted}
      selection={mention.selection}
      style={[styles.field, empty && styles.fieldEmpty]}
      submitBehavior="newline"
      value={mention.shown ? undefined : props.message}
    >
      {mention.shown
        ? mention.parts.map(({ words, mention: isMention }, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- the parts are the words in order
            <Text key={index} style={isMention ? styles.mention : undefined}>
              {words}
            </Text>
          ))
        : undefined}
    </TextInput>
  );
}

// The answer's main button on its own row above the bar, full width (P04 ticket 50): at a large font size and a long
// label a button beside the bar left the bar too narrow for its words. It tells its height, so that the bar's room
// counts it.
function MainRow({
  bottom,
  onHeight,
  children,
}: {
  bottom: number;
  onHeight: (height: number) => void;
  children: ReactNode;
}): ReactElement {
  return (
    <View
      onLayout={({ nativeEvent }) => {
        onHeight(Math.round(nativeEvent.layout.height));
      }}
      style={[styles.mainRow, { bottom }]}
      testID="ai-input-beside"
    >
      {children}
    </View>
  );
}

// The room the input takes from the screen's bottom: the bar, and the main button's row above it with its gap. Told
// at each change, so that the answer's card and the camera keep clear of both.
function useToldRoom(onHeight: (height: number) => void, bar: number, row: number | null): void {
  const room = row === null ? bar : bar + space[2] + row;
  const told = useRef<number | null>(null);
  useEffect(() => {
    if (told.current !== room) {
      told.current = room;
      onHeight(room);
    }
  }, [room, onHeight]);
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
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const [message, setMessage] = useMessage(restore ?? null);
  const mention = useMentions(message, setMessage, props.friends ?? NO_FRIENDS);
  const [height, laidOut] = useBarHeight();
  useToldRoom(onHeight, height, beside === null ? null : rowHeight);
  const canSend = message.trim() !== '';
  useEffect(() => {
    onEmpty?.(!canSend);
  }, [canSend, onEmpty]);
  const send = (): void => {
    onSend(message.trim(), mention.mentions);
    setMessage('');
  };
  return (
    <>
      <View
        onLayout={laidOut}
        style={[
          styles.bar,
          { bottom: AI_INPUT.bottom + lift },
          height > AI_INPUT.height && { borderRadius: BAR_RADIUS_TALL },
          inCard && styles.inCard,
        ]}
        testID="ai-input"
      >
        <Field field={field} mention={mention} message={message} placeholder={placeholder} />
        <SendButton canSend={canSend} onPress={send} />
      </View>
      <MentionList bottom={AI_INPUT.bottom + lift + height + space[2]} mention={mention} />
      {beside === null ? null : (
        <MainRow bottom={AI_INPUT.bottom + lift + height + space[2]} onHeight={setRowHeight}>
          {beside}
        </MainRow>
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
  mainRow: { position: 'absolute', right: AI_INPUT.side, left: AI_INPUT.side },
  fieldEmpty: { maxHeight: AI_FIELD },
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
  mention: { color: color.friend, fontWeight: '600' },
});
