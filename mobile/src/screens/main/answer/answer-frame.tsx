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
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { space } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';

import { lastReply } from '@/features/assistant/use-shown-answer';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { BubbleParts } from '../chat-bubbles';
import type { CardActions } from '../chat-cards';
import { useCardActions } from '../chat-card-actions';
import type { ChatSheetControl } from '../chat-sheet';
import { FriendProfileOver, useProfileOver } from '../friend-profile';
import type { Room } from '../layout';
import { AnswerPill } from './answer-pill';
import { EarlierTurns, TurnQuestion } from './earlier-turns';
import { WaitingReply } from './failed-and-waiting';
import { FollowUpChips } from './follow-up-chips';
import { useForgetWithUndo } from './forget-with-undo';
import { CONTENT_TOP, contentMaxOf, FrameCard } from './frame-card';
import { KeyboardHeadline } from './keyboard-headline';
import { pillIconOf } from './pill-icon';
import type { Raising } from './raise-handle';
import { ReplySteps } from './reply-steps';
import { barOf, onScreenOf, TopBar, Words } from './reply-words';
import { type BandFocus, useBandFocus } from './use-corrections';

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
  focus: BandFocus;
  // The time bar's height under the pill, 0 for none: the raised card stops under it.
  timeBarHeight: number;
}

// The card at the bottom: what was asked, the turn's bubbles without a bubble around them, each under its steps when it
// answered several requests, or the dots with 그만 in their place, and "지난 답 N개" under them, then the room of the
// bar. While the keyboard is up, the turn's headline stands in place of its content, unless the card is raised.
function AnswerCard(props: AnswerCardProps): ReactElement {
  const { control, cardActions, barRoom, stageHeight, keyboardUp, onHeight, onClose, raising, focus, timeBarHeight } =
    props;
  const card = { barRoom, onHeight, raising, stageHeight, timeBarHeight };
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
                    focus={focus}
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
  // The time bar's height under the pill, 0 while there is none.
  onBarHeight: (height: number) => void;
}

// The bar's height while it is shown, told to the screen for the camera's fit; 0 while there is none.
function useBarHeight(
  shown: boolean,
  onBarHeight: (height: number) => void,
): { height: number; onHeight: (height: number) => void } {
  const [height, setHeight] = useState(0);
  const told = shown ? height : 0;
  useEffect(() => {
    onBarHeight(told);
  }, [told, onBarHeight]);
  return { height: told, onHeight: setHeight };
}

// The frame itself: what the User asked as a pill at the top with the time bar under it when the answer has a time, and
// one card at the bottom with the reply over the input.
// ✕, Android's back button, and a card's "닫기" hide the frame and keep the conversation, a reply on its way included;
// "새 대화" forgets it, with 되돌리기 for a few seconds. While a building is asked about over the answer ("여기면 어때?"), ✕ and back return to the
// answer instead, and the pill names the building. A Friend's profile opened from the card stands over it until a new
// reply; while it is shown, the back button hides it alone. This handler is the only one, and listens only while the
// main screen is in front, so a screen pushed from the profile goes back to it. While the card is raised, back lowers it
// first.
function Framed(props: FramedProps): ReactElement {
  const { control, barRoom, stageHeight, keyboardUp, onHeight, onBarHeight } = props;
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
  const focus = useBandFocus();
  const barShown = !keyboardUp && barOf(chat.bubbles, onScreenOf(control)) !== null;
  const bar = useBarHeight(barShown, onBarHeight);
  return (
    <FriendProfileOver keyboardUp={keyboardUp} profile={profile}>
      <AnswerPill
        asked={title ?? turnOf(chat.bubbles)?.asked ?? ''}
        icon={title === null ? pillIconOf(chat.bubbles) : 'pin'}
        keyboardUp={keyboardUp}
        onClose={leave}
        onNew={forget}
      />
      {barShown ? <TopBar control={control} focus={focus} onClose={close} onHeight={bar.onHeight} /> : null}
      <AnswerCard
        timeBarHeight={bar.height}
        barRoom={barRoom}
        cardActions={actions}
        control={control}
        focus={focus}
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
  onBarHeight: (height: number) => void;
  room: Room;
}

// The answer frame over the map while the conversation holds something and the frame was not left.
export function AnswerFrame(props: AnswerFrameProps): ReactElement | null {
  const { control, inputTop, keyboardUp, onHeight, onBarHeight, room } = props;
  return control.framed ? (
    <Framed
      barRoom={inputTop + space[3]}
      control={control}
      keyboardUp={keyboardUp}
      onBarHeight={onBarHeight}
      onHeight={onHeight}
      stageHeight={room.stage?.height ?? null}
    />
  ) : null;
}

const styles = StyleSheet.create({
  part: { gap: space[2] },
});
