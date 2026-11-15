/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { type ReactElement, type ReactNode, useCallback } from 'react';
import { type LayoutChangeEvent, Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, Icon, radius, shadow, space, text } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import type { ChatBubble } from '@/features/assistant/use-chat';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import { keepsShown, lastReply, type ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { ShownLookup } from '@/features/assistant/use-shown-lookup';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { BubbleParts } from '../chat-bubbles';
import type { CardActions } from '../chat-cards';
import { ChatMarkdown } from '../chat-markdown';
import { useCardActions } from '../chat-card-actions';
import type { ChatSheetControl } from '../chat-sheet';
import { FriendProfileOver, useProfileOver } from '../friend-profile';
import { ANSWER_PILL, listsTop, type Room } from '../layout';
import { AnswerLines } from './answer-lines';
import { CloseButton } from './close-button';
import { FailedLines, WaitingReply } from './failed-and-waiting';
import { InvitedCard } from './invited-card';
import { LookupCard } from './lookup-card';
import { PlanCard } from './plan-card';
import { type RefusalAsk, RefusalReply } from './refusal-reply';

// Above the first of the card's parts.
const CONTENT_TOP = space[5];

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
        <CloseButton label="답 닫기" onPress={onClose} />
      </View>
    </View>
  );
}

interface WordsProps {
  bubble: ChatBubble;
  shown: ShownAnswer;
  lookup: ShownLookup;
  invitation: PlanInvitation;
  // How high the Plan's card may stand before the card scrolls, null until it is known.
  room: number | null;
  onClose: () => void;
  onAsk: RefusalAsk;
}

// A reply's words: the card of the answer on screen for the reply it came from, the invited Quest's once its Plan was
// made into one, the card of the Lookup on screen for its reply, with a refusal's lines over either when the refusal
// stands beside the Lookup or keeps what is on screen, else a refusal's lines and offers, a failure's lines, or the
// lines of its answer's first Plan, those that say why it has none, or its Lookup's, in place of the model's sentence;
// otherwise the sentence as Markdown.
function Words({ bubble, shown, lookup: onScreen, invitation, room, onClose, onAsk }: WordsProps): ReactElement {
  const { answer, refusal = null } = bubble;
  const keeps = keepsShown(bubble);
  const fromReply = answer !== undefined && answer !== null && answer === shown.source;
  if ((fromReply || keeps) && shown.answer !== null) {
    const { made, standings } = invitation;
    const over = keeps ? refusal?.lines : undefined;
    return made === null || shown.plan === null ? (
      <PlanCard answer={shown.answer} invitation={invitation} over={over} room={room} shown={shown} />
    ) : (
      <InvitedCard
        chips={shown.answer.chips}
        onClose={onClose}
        over={over}
        standings={standings}
        startAt={shown.plan.startAt}
        steps={made.quest.subQuests}
      />
    );
  }
  const lookup = keeps ? onScreen.lookup : (bubble.lookup ?? null);
  if (lookup !== null && lookup === onScreen.lookup) {
    return <LookupCard lookup={lookup} onAsk={onAsk} onClose={onClose} refusal={refusal} shown={onScreen} />;
  }
  if (refusal !== null) {
    return <RefusalReply onAsk={onAsk} refusal={refusal} />;
  }
  if (bubble.failure === 'unavailable') {
    return <FailedLines text={bubble.text} />;
  }
  const lines = answer?.plans[0]?.lines ?? answer?.noPlan?.lines ?? lookup?.lines;
  return lines === undefined ? <ChatMarkdown style={styles.words} text={bubble.text} /> : <AnswerLines lines={lines} />;
}

interface AnswerCardProps {
  control: ChatSheetControl;
  cardActions: CardActions;
  // From the stage's bottom to a little above the bar's top: the room the card keeps for the bar.
  barRoom: number;
  // The stage's height, null until it is laid out.
  stageHeight: number | null;
  keyboardUp: boolean;
  onHeight: (height: number) => void;
  onClose: () => void;
}

interface FrameCardProps {
  // From the stage's bottom: the room the card keeps under its content.
  barRoom: number;
  // The stage's height, null until it is laid out: the card takes at most about half of it.
  stageHeight: number | null;
  onHeight: (height: number) => void;
  testID: string;
  // Null leaves the card empty, as while the keyboard is up.
  children: ReactNode;
}

// The most the card's content takes, about half the stage, null until the stage is laid out.
function contentMaxOf(stageHeight: number | null, barRoom: number): number | null {
  return stageHeight === null ? null : Math.max(0, stageHeight / 2 - barRoom);
}

// The frame's card, attached to the bottom of the screen. Its content scrolls inside it.
export function FrameCard({ barRoom, stageHeight, onHeight, testID, children }: FrameCardProps): ReactElement {
  const contentMax = contentMaxOf(stageHeight, barRoom);
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        onHeight(nativeEvent.layout.height);
      }}
      style={[styles.card, { paddingBottom: barRoom }]}
      testID={testID}
    >
      {children === null ? null : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          style={contentMax === null ? undefined : { maxHeight: contentMax }}
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}

// The card at the bottom: the turn's bubbles without a bubble around them, or "보는 중" with 그만, and under them the
// room of the bar. Its content gives way to the keyboard.
function AnswerCard(props: AnswerCardProps): ReactElement {
  const { control, cardActions, barRoom, stageHeight, keyboardUp, onHeight, onClose } = props;
  const { bubbles, waiting, retry } = control.chat;
  const after = turnOf(bubbles)?.after ?? [];
  const last = bubbles.at(-1);
  const contentMax = contentMaxOf(stageHeight, barRoom);
  return (
    <FrameCard barRoom={barRoom} onHeight={onHeight} stageHeight={stageHeight} testID="answer-card">
      {keyboardUp ? null : (
        <>
          {after.map((bubble) => (
            <View key={bubble.id} style={styles.part}>
              <BubbleParts
                bubble={bubble}
                cardActions={cardActions}
                onRetry={bubble.failure === 'unavailable' && bubble === last && !waiting ? retry : null}
                onShowLayer={control.leaving.showLayer}
                words={
                  <Words
                    bubble={bubble}
                    invitation={control.invitation}
                    lookup={control.lookup}
                    onAsk={control.chat.send}
                    onClose={onClose}
                    room={contentMax === null ? null : contentMax - CONTENT_TOP}
                    shown={control.answer}
                  />
                }
              />
            </View>
          ))}
          {waiting ? <WaitingReply onStop={onClose} /> : null}
        </>
      )}
    </FrameCard>
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
// ✕ and Android's back button forget the conversation, a reply on its way included. A Friend's profile opened from
// the card stands over it until a new reply; while it is shown, the back button hides it alone. This handler is the
// only one, and listens only while the main screen is in front, so a screen pushed from the profile goes back to it.
function Framed({ control, barRoom, stageHeight, keyboardUp, onHeight }: FramedProps): ReactElement {
  const { chat, leaving } = control;
  const { reset } = chat;
  const close = useCallback((): void => {
    Keyboard.dismiss();
    reset();
  }, [reset]);
  const profile = useProfileOver(lastReply(chat.bubbles)?.id ?? null);
  const profileShown = profile.friend !== null && !keyboardUp;
  useBackToClose(useIsFocused(), profileShown ? profile.hide : close, { edge: false });
  const { actions, sheets } = useCardActions(chat, leaving);
  return (
    <FriendProfileOver keyboardUp={keyboardUp} profile={profile}>
      <AnswerPill asked={turnOf(chat.bubbles)?.asked ?? ''} onClose={close} />
      <AnswerCard
        barRoom={barRoom}
        cardActions={actions}
        control={control}
        keyboardUp={keyboardUp}
        onClose={close}
        onHeight={onHeight}
        stageHeight={stageHeight}
      />
      {sheets}
    </FriendProfileOver>
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
  const { onMap, framed } = control;
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
  return onMap && keyboardUp ? (
    <Text style={[styles.notice, { bottom: inputTop + space[2] }]}>대화 내용은 AI 제공자에게 전송돼요</Text>
  ) : null;
}

const styles = StyleSheet.create({
  pillRow: {
    position: 'absolute',
    right: ANSWER_PILL.side,
    left: ANSWER_PILL.side,
    alignItems: 'flex-start',
    pointerEvents: 'box-none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    maxWidth: '100%',
    height: ANSWER_PILL.height,
    paddingLeft: space[4],
    paddingRight: space[1],
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  asked: { ...text.label, flexShrink: 1, color: color.ink },
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
  content: { gap: space[3], paddingTop: CONTENT_TOP, paddingHorizontal: space[4] },
  part: { gap: space[2] },
  words: { ...text.bodyLg, color: color.ink },
  notice: { ...text.caption, position: 'absolute', right: space[4], left: space[4], color: color.inkMuted },
});
