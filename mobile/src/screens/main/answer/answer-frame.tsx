/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { type ReactElement, type ReactNode, useCallback } from 'react';
import { type LayoutChangeEvent, Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { color, radius, shadow, space, text } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import type { Chat, ChatBubble } from '@/features/assistant/use-chat';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { HowAbout } from '@/features/assistant/use-how-about';
import { keepsShown, lastReply, type ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { ShownLookup } from '@/features/assistant/use-shown-lookup';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { BubbleParts } from '../chat-bubbles';
import type { CardActions } from '../chat-cards';
import { ChatMarkdown } from '../chat-markdown';
import { useCardActions } from '../chat-card-actions';
import type { ChatSheetControl } from '../chat-sheet';
import { FriendProfileOver, useProfileOver } from '../friend-profile';
import type { Room } from '../layout';
import { AnswerLines } from './answer-lines';
import { AnswerPill } from './answer-pill';
import { FailedLines, WaitingReply } from './failed-and-waiting';
import { HowAboutCard } from './how-about-card';
import { LookupCard } from './lookup-card';
import { MadeCard } from './made-card';
import { OfferedWords } from './offered-words';
import { pillIconOf } from './pill-icon';
import { PlanCard } from './plan-card';
import { type RefusalAsk, RefusalReply } from './refusal-reply';

// Above the first of the card's parts.
const CONTENT_TOP = space[5];

interface WordsProps {
  bubble: ChatBubble;
  shown: ShownAnswer;
  lookup: ShownLookup;
  invitation: PlanInvitation;
  howAbout: HowAbout;
  // How high the Plan's card may stand before the card scrolls, null until it is known.
  room: number | null;
  onClose: () => void;
  onAsk: RefusalAsk;
  // A turn a Lookup's button asked of the recalculation.
  addRecalculated: Chat['addRecalculated'];
}

// A reply's words: the card of the answer on screen for the reply it came from, the made Quest's once its Plan was
// made into one, the card of the Lookup on screen for its reply, with a refusal's lines over either when the refusal
// stands beside the Lookup or keeps what is on screen, else a refusal's lines and offers, a failure's lines, or the
// lines of its answer's first Plan, those that say why it has none, or its Lookup's, in place of the model's sentence;
// otherwise the sentence as Markdown.
function Words(props: WordsProps): ReactElement {
  const { bubble, shown, lookup: onScreen, invitation, howAbout, room, onClose, onAsk, addRecalculated } = props;
  const { answer, refusal = null } = bubble;
  const keeps = keepsShown(bubble);
  const fromReply = answer !== undefined && answer !== null && answer === shown.source;
  if (fromReply && howAbout.place !== null && shown.plan !== null) {
    return <HowAboutCard current={shown.plan} howAbout={howAbout} />;
  }
  if ((fromReply || keeps) && shown.answer !== null) {
    const { made } = invitation;
    const over = keeps ? refusal?.lines : undefined;
    return made === null || shown.plan === null ? (
      <PlanCard answer={shown.answer} invitation={invitation} onClose={onClose} over={over} room={room} shown={shown} />
    ) : (
      <MadeCard
        answer={shown.answer}
        invitation={invitation}
        made={made}
        onClose={onClose}
        over={over}
        plan={shown.plan}
      />
    );
  }
  const lookup = keeps ? onScreen.lookup : (bubble.lookup ?? null);
  if (lookup !== null && lookup === onScreen.lookup) {
    return (
      <LookupCard
        addRecalculated={addRecalculated}
        lookup={lookup}
        onAsk={onAsk}
        onClose={onClose}
        refusal={refusal}
        shown={onScreen}
      />
    );
  }
  if (refusal !== null) {
    return <RefusalReply onAsk={onAsk} refusal={refusal} />;
  }
  if (bubble.failure === 'unavailable') {
    return <FailedLines text={bubble.text} />;
  }
  if (bubble.offers !== undefined && bubble.offers.length > 0) {
    return <OfferedWords offers={bubble.offers} onAsk={onAsk} text={bubble.text} />;
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
                    addRecalculated={control.chat.addRecalculated}
                    bubble={bubble}
                    howAbout={control.howAbout}
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
// ✕ and Android's back button forget the conversation, a reply on its way included; while a building is asked about
// over the answer ("여기면 어때?"), they return to the answer instead, and the pill names the building. A Friend's profile opened from
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
  const { title, keep } = control.howAbout;
  const leave = title === null ? close : keep;
  useBackToClose(useIsFocused(), profileShown ? profile.hide : leave, { edge: false });
  const { actions, sheets } = useCardActions(chat, leaving);
  return (
    <FriendProfileOver keyboardUp={keyboardUp} profile={profile}>
      <AnswerPill
        asked={title ?? turnOf(chat.bubbles)?.asked ?? ''}
        icon={title === null ? pillIconOf(chat.bubbles) : 'pin'}
        onClose={leave}
      />
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

// The answer frame over the map while the conversation holds something.
export function AnswerFrame({ control, inputTop, keyboardUp, onHeight, room }: AnswerFrameProps): ReactElement | null {
  return control.framed ? (
    <Framed
      barRoom={inputTop + space[3]}
      control={control}
      keyboardUp={keyboardUp}
      onHeight={onHeight}
      stageHeight={room.stage?.height ?? null}
    />
  ) : null;
}

const styles = StyleSheet.create({
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
});
