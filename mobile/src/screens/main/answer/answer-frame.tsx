/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { type ReactElement, useCallback, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { color, space, text } from '@/design-system';
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
import { EarlierTurns, TurnQuestion } from './earlier-turns';
import { FailedLines, WaitingReply } from './failed-and-waiting';
import { FollowUpChips } from './follow-up-chips';
import { useForgetWithUndo } from './forget-with-undo';
import { CONTENT_TOP, contentMaxOf, FrameCard } from './frame-card';
import { HowAboutCard } from './how-about-card';
import { KeyboardHeadline } from './keyboard-headline';
import { LookupCard } from './lookup-card';
import { MadeCard } from './made-card';
import { OfferedWords } from './offered-words';
import { pillIconOf } from './pill-icon';
import { PlanCard } from './plan-card';
import type { Raising } from './raise-handle';
import { type RefusalAsk, RefusalReply } from './refusal-reply';
import { ReplySteps } from './reply-steps';

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
  raising: Raising;
}

// The card at the bottom: what was asked, the turn's bubbles without a bubble around them, each under its steps when it
// answered several requests, or the dots with 그만 in their place, and "지난 답 N개" under them, then the room of the
// bar. While the keyboard is up, the turn's headline stands in place of its content, unless the card is raised.
function AnswerCard(props: AnswerCardProps): ReactElement {
  const { control, cardActions, barRoom, stageHeight, keyboardUp, onHeight, onClose, raising } = props;
  const card = { barRoom, onHeight, raising, stageHeight };
  const { bubbles, waiting, retry } = control.chat;
  const turn = turnOf(bubbles);
  const after = turn?.after ?? [];
  const last = bubbles.at(-1);
  const contentMax = contentMaxOf(stageHeight, barRoom);
  return (
    <FrameCard {...card} hold={waiting} testID="answer-card">
      {keyboardUp && !raising.raised ? (
        <KeyboardHeadline control={control} />
      ) : (
        <>
          {turn === null ? null : <TurnQuestion turn={turn} />}
          {after.map((bubble) => (
            <View key={bubble.id} style={styles.part}>
              {bubble.steps === undefined ? null : <ReplySteps steps={bubble.steps} />}
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
          {waiting ? <WaitingReply onStop={control.chat.stop} /> : <FollowUps control={control} />}
          <EarlierTurns bubbles={bubbles} />
        </>
      )}
    </FrameCard>
  );
}

// The follow-ups under the reply on screen, while neither the list of Friends to add nor the time band moved whole
// takes the card.
function FollowUps({ control }: { control: ChatSheetControl }): ReactElement | null {
  const { answer, chat } = control;
  const reply = lastReply(chat.bubbles);
  const onScreen = reply !== undefined && (turnOf(chat.bubbles)?.after.includes(reply) ?? false);
  return answer.adding || answer.moving !== null || !onScreen ? null : (
    <FollowUpChips onAsk={chat.send} reply={reply} />
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
// ✕, Android's back button, and a card's "닫기" hide the frame and keep the conversation, a reply on its way included;
// "새 대화" forgets it, with 되돌리기 for a few seconds. While a building is asked about over the answer ("여기면 어때?"), ✕ and back return to the
// answer instead, and the pill names the building. A Friend's profile opened from the card stands over it until a new
// reply; while it is shown, the back button hides it alone. This handler is the only one, and listens only while the
// main screen is in front, so a screen pushed from the profile goes back to it. While the card is raised, back lowers it
// first.
function Framed({ control, barRoom, stageHeight, keyboardUp, onHeight }: FramedProps): ReactElement {
  const { chat, leaving, hide } = control;
  const { reset } = chat;
  const close = useCallback((): void => {
    Keyboard.dismiss();
    hide();
  }, [hide]);
  const forget = useForgetWithUndo(reset);
  const profile = useProfileOver(lastReply(chat.bubbles)?.id ?? null);
  const profileShown = profile.friend !== null && !keyboardUp;
  const { title, keep } = control.howAbout;
  const leave = title === null ? close : keep;
  const [raised, setRaised] = useState(false);
  const lower = useCallback((): void => {
    setRaised(false);
  }, []);
  useBackToClose(useIsFocused(), profileShown ? profile.hide : raised ? lower : leave, { edge: false });
  const { actions, sheets } = useCardActions(chat, leaving);
  return (
    <FriendProfileOver keyboardUp={keyboardUp} profile={profile}>
      <AnswerPill
        asked={title ?? turnOf(chat.bubbles)?.asked ?? ''}
        icon={title === null ? pillIconOf(chat.bubbles) : 'pin'}
        keyboardUp={keyboardUp}
        onClose={leave}
        onNew={forget}
      />
      <AnswerCard
        barRoom={barRoom}
        cardActions={actions}
        control={control}
        keyboardUp={keyboardUp}
        onClose={close}
        onHeight={onHeight}
        raising={{ raised, setRaised }}
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

// The answer frame over the map while the conversation holds something and the frame was not left.
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
  part: { gap: space[2] },
  words: { ...text.bodyLg, color: color.ink },
});
