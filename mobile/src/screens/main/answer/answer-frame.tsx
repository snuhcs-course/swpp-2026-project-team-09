/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { type ReactElement, useCallback } from 'react';
import { type LayoutChangeEvent, Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, Icon, radius, shadow, space, text } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { BubbleParts } from '../chat-bubbles';
import type { CardActions } from '../chat-cards';
import { ChatMarkdown } from '../chat-markdown';
import { useCardActions } from '../chat-card-actions';
import type { ChatSheetControl } from '../chat-sheet';
import { listsTop, type Room } from '../layout';
import { AnswerLines } from './answer-lines';

const PILL_HEIGHT = 48;
const CLOSE = 36;

// What the User asked, on one line, with the chat icon and ✕, which forgets the conversation.
function AnswerPill({ asked, onClose }: { asked: string; onClose: () => void }): ReactElement {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.pillRow, { top: listsTop(top) }]}>
      <View style={styles.pill} testID="answer-pill">
        <Icon color={color.ink} name="chat" size={20} />
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.asked}>
          {asked}
        </Text>
        <Pressable accessibilityLabel="답 닫기" accessibilityRole="button" onPress={onClose} style={styles.close}>
          <Icon color={color.ink} name="x" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

// A reply's words: the lines of its answer's first Plan, or those that say why it has none, in place of the model's
// sentence; otherwise the sentence as Markdown.
function Words({ bubble }: { bubble: ChatBubble }): ReactElement {
  const { answer } = bubble;
  const lines = answer?.plans[0]?.lines ?? answer?.noPlan?.lines;
  return lines === undefined ? <ChatMarkdown style={styles.words} text={bubble.text} /> : <AnswerLines lines={lines} />;
}

interface AnswerCardProps {
  control: ChatSheetControl;
  cardActions: CardActions;
  // From the stage's bottom to a little above the bar's top: the room the card keeps for the bar.
  barRoom: number;
  // The most the content takes, null until the stage is laid out.
  contentMax: number | null;
  keyboardUp: boolean;
  onHeight: (height: number) => void;
}

// The card at the bottom: the turn's bubbles without a bubble around them, or "보는 중이에요", and under them the room
// of the bar. Its content scrolls inside it, and gives way to the keyboard.
function AnswerCard(props: AnswerCardProps): ReactElement {
  const { control, cardActions, barRoom, contentMax, keyboardUp, onHeight } = props;
  const { bubbles, waiting, retry } = control.chat;
  const after = turnOf(bubbles)?.after ?? [];
  const last = bubbles.at(-1);
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        onHeight(nativeEvent.layout.height);
      }}
      style={[styles.card, { paddingBottom: barRoom }]}
      testID="answer-card"
    >
      {keyboardUp ? null : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          style={contentMax === null ? undefined : { maxHeight: contentMax }}
        >
          {after.map((bubble) => (
            <View key={bubble.id} style={styles.part}>
              <BubbleParts
                bubble={bubble}
                cardActions={cardActions}
                onRetry={bubble.failure === 'unavailable' && bubble === last && !waiting ? retry : null}
                onShowLayer={control.answer.showLayer}
                words={<Words bubble={bubble} />}
              />
            </View>
          ))}
          {waiting ? <Text style={styles.words}>보는 중이에요</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}

interface FramedProps {
  control: ChatSheetControl;
  barRoom: number;
  // The stage's height, null until it is laid out: the card takes at most about half of it.
  stageHeight: number | null;
  keyboardUp: boolean;
  onHeight: (height: number) => void;
}

// The frame itself: what the User asked as a pill at the top, and one card at the bottom with the reply over the bar.
// ✕ and Android's back button forget the conversation, a reply on its way included.
function Framed({ control, barRoom, stageHeight, keyboardUp, onHeight }: FramedProps): ReactElement {
  const { chat, answer } = control;
  const { reset } = chat;
  const close = useCallback((): void => {
    Keyboard.dismiss();
    reset();
  }, [reset]);
  useBackToClose(useIsFocused(), close, { edge: false });
  const { actions, sheets } = useCardActions(chat, answer);
  return (
    <>
      <AnswerPill asked={turnOf(chat.bubbles)?.asked ?? ''} onClose={close} />
      <AnswerCard
        barRoom={barRoom}
        cardActions={actions}
        contentMax={stageHeight === null ? null : Math.max(0, stageHeight / 2 - barRoom)}
        control={control}
        keyboardUp={keyboardUp}
        onHeight={onHeight}
      />
      {sheets}
    </>
  );
}

interface AnswerFrameProps {
  control: ChatSheetControl;
  // The AI input's top, from the stage's bottom.
  inputTop: number;
  keyboardUp: boolean;
  onHeight: (height: number) => void;
  room: Room;
}

// The answer frame over the map while the switch is on and the conversation holds something. Before anything is
// asked, while the bar has the keyboard, where the conversation goes stands above it.
export function AnswerFrame({ control, inputTop, keyboardUp, onHeight, room }: AnswerFrameProps): ReactElement | null {
  const { frame, framed } = control;
  if (framed) {
    return (
      <Framed
        barRoom={inputTop + space[3]}
        control={control}
        keyboardUp={keyboardUp}
        onHeight={onHeight}
        stageHeight={room.stage?.height ?? null}
      />
    );
  }
  return frame && keyboardUp ? (
    <Text style={[styles.notice, { bottom: inputTop + space[2] }]}>대화 내용은 AI 제공자에게 전송돼요</Text>
  ) : null;
}

const styles = StyleSheet.create({
  pillRow: {
    position: 'absolute',
    right: space[4],
    left: space[4],
    alignItems: 'flex-start',
    pointerEvents: 'box-none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    maxWidth: '100%',
    height: PILL_HEIGHT,
    paddingLeft: space[4],
    paddingRight: space[1],
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  asked: { ...text.label, flexShrink: 1, color: color.ink },
  close: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CLOSE,
    height: CLOSE,
    borderRadius: CLOSE / 2,
    backgroundColor: color.surfaceSunken,
  },
  card: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.sheet,
  },
  content: { gap: space[3], paddingTop: space[5], paddingHorizontal: space[4] },
  part: { gap: space[2] },
  words: { ...text.bodyLg, color: color.ink },
  notice: { ...text.caption, position: 'absolute', right: space[4], left: space[4], color: color.inkMuted },
});
