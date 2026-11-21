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

import type { ChatBubble } from '@/features/assistant/use-chat';
import { keepsShown, lastReply } from '@/features/assistant/use-shown-answer';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { BubbleParts } from '../chat-bubbles';
import type { CardActions } from '../chat-cards';
import { useCardActions } from '../chat-card-actions';
import type { ChatSheetControl } from '../chat-sheet';
import { FriendProfileOver, useProfileOver } from '../friend-profile';
import { AI_INPUT, type Room } from '../layout';
import { AnswerPill } from './answer-pill';
import { EarlierTurns, TurnQuestion } from './earlier-turns';
import { WaitingReply } from './failed-and-waiting';
import { FollowUpChips } from './follow-up-chips';
import { useForgetWithUndo } from './forget-with-undo';
import { CONTENT_TOP, contentMaxOf, FrameCard } from './frame-card';
import { KeyboardHeadline } from './keyboard-headline';
import { MarkCard } from './mark-card';
import { DockedAnswer } from './docked-answer';
import { MarkRows } from './mark-rows';
import { planCardRests } from './plan-card';
import { pillIconOf } from './pill-icon';
import type { Raising } from './raise-handle';
import { ReplySteps } from './reply-steps';
import { barOf, onScreenOf, planShown, TopBar, Words } from './reply-words';
import { type BandFocus, useBandFocus } from './use-corrections';

// The turn on screen is its Plan's card alone with nothing to read: the card docks as one row around the input (board
// 10), whose chips raise it for the earlier turns and the note.
function restsDocked(control: ChatSheetControl, after: readonly ChatBubble[]): boolean {
  const { answer: shown, chat } = control;
  const [reply] = after;
  const own =
    after.length === 1 &&
    reply !== undefined &&
    reply.cards.length === 0 &&
    reply.mapButtons.length === 0 &&
    reply.proposal === null &&
    reply.steps === undefined;
  const refusal = reply !== undefined && keepsShown(reply) ? (reply.refusal?.lines ?? []) : [];
  return (
    own &&
    planShown(chat.bubbles, onScreenOf(control)) &&
    shown.answer !== null &&
    planCardRests(shown, shown.answer, refusal)
  );
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
  focus: BandFocus;
  // The time bar's height under the pill, 0 for none: the raised card stops under it.
  timeBarHeight: number;
  inputBottom: number;
  // Whether the earlier turns are open under the turn on screen; the dock's "지난 답 N개" opens them.
  earlier: { open: boolean; setOpen: (open: boolean) => void };
}

// The card at the bottom: what was asked, unless the Plan's card shows (the pill says it), the turn's bubbles without a
// bubble around them, each under its steps when it answered several requests, or the dots with 그만 in their place,
// and "지난 답 N개" under them, then the room of the bar. While the keyboard is up, the turn's headline and its
// follow-ups stand in place of its content, unless the card is raised.
function AnswerCard(props: AnswerCardProps): ReactElement {
  const { control, barRoom, stageHeight, keyboardUp, onHeight, onClose, raising, focus, timeBarHeight } = props;
  const card = { barRoom, onHeight, raising, stageHeight, timeBarHeight, inputBottom: props.inputBottom };
  const { bubbles, waiting } = control.chat;
  const after = turnOf(bubbles)?.after ?? [];
  const contentMax = contentMaxOf(stageHeight, barRoom);
  const docked = !keyboardUp && !raising.raised && !waiting && restsDocked(control, after);
  const [reply] = after;
  const raise = (open: boolean): void => {
    props.earlier.setOpen(open);
    raising.setRaised(true);
  };
  return (
    <FrameCard {...card} docked={docked} hold={waiting} testID="answer-card">
      {keyboardUp && !raising.raised ? (
        <Typing control={control} />
      ) : docked && reply !== undefined ? (
        <DockedAnswer bubble={reply} control={control} focus={focus} onClose={onClose} onRaise={raise} />
      ) : (
        <OpenAnswer {...props} room={contentMax === null ? null : contentMax - CONTENT_TOP} />
      )}
    </FrameCard>
  );
}

// The open card's content: what was asked, unless the Plan's card shows, the turn's bubbles, each under its steps, the
// dots with 그만 while a reply is on its way, and the earlier turns.
function OpenAnswer(props: AnswerCardProps & { room: number | null }): ReactElement {
  const { control, cardActions, focus, onClose, room } = props;
  const { bubbles, waiting, retry } = control.chat;
  const turn = turnOf(bubbles);
  const last = bubbles.at(-1);
  return (
    <>
      {turn === null || planShown(bubbles, onScreenOf(control)) ? null : <TurnQuestion turn={turn} />}
      {(turn?.after ?? []).map((bubble) => (
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
                room={room}
                shown={control.answer}
              />
            }
          />
        </View>
      ))}
      {waiting ? <WaitingReply onStop={control.chat.stop} /> : null}
      <EarlierTurns bubbles={bubbles} opening={props.earlier} />
    </>
  );
}

// While the keyboard is up: the turn's headline and its follow-ups.
function Typing({ control }: { control: ChatSheetControl }): ReactElement {
  return (
    <>
      <KeyboardHeadline control={control} />
      {control.chat.waiting ? null : <FollowUps control={control} />}
    </>
  );
}

// The follow-ups of the reply on screen while the keyboard is up, as one row of small chips over it: they are words to
// type, so they come with typing. None while the list of Friends to add or the time band moved whole takes the card.
function FollowUps({ control }: { control: ChatSheetControl }): ReactElement | null {
  const { answer, chat } = control;
  const reply = lastReply(chat.bubbles);
  const onScreen = reply !== undefined && (turnOf(chat.bubbles)?.after.includes(reply) ?? false);
  return answer.adding || answer.moving !== null || !onScreen ? null : (
    <FollowUpChips
      onAsk={(words) => {
        // As every send from the input does, so that the card shows the reply.
        Keyboard.dismiss();
        chat.send(words);
      }}
      reply={reply}
    />
  );
}

// Whether the card is raised, and whether its earlier turns are open.
function useCardState(): {
  raised: boolean;
  setRaised: (raised: boolean) => void;
  lower: () => void;
  earlier: AnswerCardProps['earlier'];
} {
  const [raised, setRaised] = useState(false);
  const [open, setOpen] = useState(false);
  const lower = useCallback((): void => {
    setRaised(false);
  }, []);
  return { raised, setRaised, lower, earlier: { open, setOpen } };
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
  stage: Room['stage'];
  // The AI input's bottom, from the stage's bottom: the docked card's edge stands just under it.
  inputBottom: number;
}

interface OpenMarkProps {
  control: ChatSheetControl;
  stage: Room['stage'];
  focus: BandFocus;
  onClose: () => void;
}

// The card of the mark pressed on the map, while one is open and the keyboard is down: a mark of the Plan on screen.
function OpenMark({ control, stage, focus, onClose }: OpenMarkProps): ReactElement | null {
  const { mark, closeMark, answer: shown } = control;
  if (mark === null || stage === null || shown.answer === null || shown.plan === null) {
    return null;
  }
  return (
    <MarkCard beside={mark.id.startsWith('answer:person:')} mark={mark} onClose={closeMark} stage={stage}>
      <MarkRows
        answer={shown.answer}
        focus={focus}
        id={mark.id}
        onClose={onClose}
        onDone={closeMark}
        plan={shown.plan}
        shown={shown}
      />
    </MarkCard>
  );
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
// main screen is in front, so a screen pushed from the profile goes back to it. While a mark's card is open, back closes
// it first; while the card is raised, back lowers it first.
function Framed(props: FramedProps): ReactElement {
  const { control, barRoom, stageHeight, keyboardUp, onHeight, onBarHeight, stage, inputBottom } = props;
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
  const { raised, setRaised, lower, earlier } = useCardState();
  const back = control.mark === null ? (raised ? lower : leave) : control.closeMark;
  useBackToClose(useIsFocused(), profileShown ? profile.hide : back, { edge: false });
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
        earlier={earlier}
        inputBottom={inputBottom}
        control={control}
        focus={focus}
        keyboardUp={keyboardUp}
        onClose={close}
        onHeight={onHeight}
        raising={{ raised, setRaised }}
        stageHeight={stageHeight}
      />
      {keyboardUp ? null : <OpenMark control={control} focus={focus} onClose={close} stage={stage} />}
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
      inputBottom={inputTop - (room.inputHeight ?? AI_INPUT.height)}
      control={control}
      keyboardUp={keyboardUp}
      onBarHeight={onBarHeight}
      onHeight={onHeight}
      stage={room.stage}
      stageHeight={room.stage?.height ?? null}
    />
  ) : null;
}

const styles = StyleSheet.create({
  part: { gap: space[2] },
});
