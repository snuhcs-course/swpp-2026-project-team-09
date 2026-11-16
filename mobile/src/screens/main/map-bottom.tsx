/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { now } from '@/clock';
import { space } from '@/design-system';
import { restoreOf } from '@/features/assistant/restore';
import { nextMeal } from '@/features/dining/adapter';
import type { FirstRun } from '@/features/first-run/use-first-run';
import type { CardView } from '@/features/map/adapter';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { tabBarHeight } from '../shell/layout';
import { AiInput } from './ai-input';
import { AnswerFrame } from './answer/answer-frame';
import { MadeQuestFrame } from './answer/made-quest-frame';
import { InvitationFrame } from './answer/received-invitation-card';
import { RowFourProvider } from './answer/row-four-actions';
import { BottomControls } from './bottom-controls';
import type { ChatSheetControl } from './chat-sheet';
import { LayerControls, type LayerStack } from './layers';
import { FirstRunAsk } from './first-run/first-run-ask';
import { InterestsHint } from './first-run/interests-hint';
import { AI_INPUT, CARD, interestsHintBottom, LAYERS_BUTTON, madeLineBottom, type Room } from './layout';
import { MadeQuestLine } from './made-quest-line';
import { ShuttleNotice } from './shuttle-notice';
import { TutorialPager } from './tutorial/tutorial-pager';
import { TutorialSheet } from './tutorial/tutorial-sheet';
import { TutorialStartButton } from './tutorial/tutorial-start-button';
import type { UnaskedCards } from './use-map-view';
import type { TutorialFlow } from './tutorial/use-tutorial-flow';
import type { TutorialPinTarget } from './tutorial/use-tutorial-pin';

// The menu panel at the meal served next, at a restaurant's section or at the top of the list.
export function openMenus(restaurant?: string): void {
  const { date, meal } = nextMeal(now());
  router.push({ pathname: '/menus', params: restaurant === undefined ? { date, meal } : { date, meal, restaurant } });
}

// How much higher the 편의기능 button stands above the shuttle's notice, 8 above its top; 0 without it.
function liftOver(noticeHeight: number | null): number {
  return noticeHeight === null ? 0 : CARD.bottom + noticeHeight + space[2] - LAYERS_BUTTON.bottom;
}

// How much higher the AI input stands while the keyboard is up: the keyboard's reach less what already lies under
// the bar, the navigation with the phone's own bar, which the keyboard covers. 0 while it is down. While the answer
// frame is shown the navigation gives way, and the bar stands above the phone's own bar or the keyboard.
function useKeyboardLift(framed: boolean): { lift: number; keyboardUp: boolean } {
  const { bottom } = useSafeAreaInsets();
  const keyboard = useKeyboardHeight(bottom);
  const lift = framed ? Math.max(bottom, keyboard) : Math.max(0, keyboard - tabBarHeight(bottom));
  return { lift, keyboardUp: keyboard > 0 };
}

// With the switch of the answer on the map on, a send puts the keyboard down, so that the frame's card shows the reply.
function sendWithKeyboardDown(send: (text: string) => void): (text: string) => void {
  return (text) => {
    Keyboard.dismiss();
    send(text);
  };
}

// What the open card, the first run's card, and the shuttle's notice take. A 식당's card sits at the top: the lists
// give way to it, and what is at the bottom stays. The first run's card is shown only while nothing is selected, and
// takes the bottom as a card does, as the User's own card does. The notice, the shuttle's service hours, gives way to
// any card; what a card at the bottom hides gives way to the notice too, and the 편의기능 button stands above it.
// `otherCard`: the first run's card or the User's own is shown.
export interface Taken {
  topCard: boolean;
  bottomCard: boolean;
  notice: string | null;
}

export function takenBy(selected: CardView | null, serviceHours: string | null, otherCard = false): Taken {
  const topCard = selected?.kind === 'dining';
  return {
    topCard,
    bottomCard: (selected !== null && !topCard) || otherCard,
    notice: selected === null && !otherCard ? serviceHours : null,
  };
}

interface MapBottomProps {
  taken: Taken;
  onNoticeHeight: (height: number) => void;
  // The answer frame's card was laid out with this height.
  onAnswerHeight: (height: number) => void;
  // "활성 파티": the room of the User's Party's Quest.
  onParty: () => void;
  room: Room;
  stack: LayerStack;
  // The 새내기 튜토리얼: its start button while `room.tutorialStart`, its pager and its quests' sheets.
  tutorial: TutorialFlow;
  // A quest's 지도에서 보기.
  onShowOnMap: (target: TutorialPinTarget) => void;
  // The chat's sheet, which the main screen holds, so that a card's button can ask the Assistant.
  chat: ChatSheetControl;
  // A received invitation, whose card stands at the bottom in place of everything else there while it is shown, and
  // the Quests made from a Plan: the first one's line over the input, and the card after inviting opened again, which
  // stands at the bottom as an invitation's does.
  unasked: UnaskedCards;
  // The first run's card to show, null while another thing takes the bottom, and the line that asks for interests.
  firstRun: Pick<FirstRun, 'card' | 'answer' | 'openInterests'>;
}

type EverydayProps = Pick<
  MapBottomProps,
  'taken' | 'onParty' | 'onNoticeHeight' | 'room' | 'stack' | 'tutorial' | 'firstRun' | 'unasked'
> & { keyboardUp: boolean };

// The line of the first Quest made from a Plan, while the room has it and the keyboard is down.
function MadeLine({
  room,
  unasked,
  keyboardUp,
}: Pick<EverydayProps, 'room' | 'unasked' | 'keyboardUp'>): ReactElement | null {
  const { first, openCard } = unasked.made;
  if (first === null || room.madeLine !== true || keyboardUp) {
    return null;
  }
  return (
    <MadeQuestLine
      bottom={madeLineBottom(room.tutorialStart, room.interestsHint)}
      onPress={() => {
        openCard(first.quest.id);
      }}
      words={first.words}
    />
  );
}

// What the everyday map has at its bottom while no chat, no answer, and no card nobody asked for is shown: the
// shuttle's notice, the row of buttons, the 편의기능 button, the tutorial's start, the first run's card and its line
// that asks for interests, and the line of a made Quest.
function EverydayBottom(props: EverydayProps): ReactElement {
  const { taken, onParty, onNoticeHeight, room, stack, tutorial, firstRun } = props;
  const { bottomCard, notice } = taken;
  return (
    <>
      {notice === null ? null : <ShuttleNotice onHeight={onNoticeHeight} serviceHours={notice} />}
      <BottomControls cardOpen={bottomCard || notice !== null} onActiveParty={onParty} room={room} />
      {bottomCard ? null : <LayerControls lift={notice === null ? 0 : liftOver(room.cardHeight)} stack={stack} />}
      {room.tutorialStart ? <TutorialStartButton onPress={tutorial.openPager} /> : null}
      {firstRun.card === null ? null : (
        <FirstRunAsk card={firstRun.card} onAnswer={firstRun.answer} onHeight={onNoticeHeight} />
      )}
      {room.interestsHint ? (
        <InterestsHint bottom={interestsHintBottom(room.tutorialStart)} onPress={firstRun.openInterests} />
      ) : null}
      <MadeLine {...props} />
    </>
  );
}

// What is at the bottom of the map: the everyday map's own (`EverydayBottom`) and the AI input. A card at the bottom
// hides the row and the button; the notice hides the row, and the button stands above it. The AI input opens the
// chat's sheet, which hides the rest and lies under the input: the input stays, as the chat's own, in the same place
// in the tree, so that it keeps the focus. While the keyboard is up, the input stands right above it, and the chat
// keeps its last bubble clear of it there. The conversation is kept while the app runs. With the switch of the answer
// on the map on, the answer frame takes the sheet's place, and the input is its card's. A card nobody asked for, a
// received invitation's or a made Quest's, takes the bottom without the input.
export function MapBottom(props: MapBottomProps): ReactElement {
  const { onAnswerHeight, room, tutorial, onShowOnMap, chat, unasked } = props;
  const { invitation, made } = unasked;
  const [inputHeight, setInputHeight] = useState<number>(AI_INPUT.height);
  const { lift, keyboardUp } = useKeyboardLift(chat.framed);
  const cardShown = invitation.shown || made.shown !== null;
  // The open list of Friends to add takes the input's place in the answer's card, and so does 보는 중 with 그만. The
  // time band moved whole hides the input but keeps its room, so that the card and its lanes stay under the finger.
  const inputGone = chat.framed && (chat.answer.adding || chat.chat.waiting);
  const inputShown = !inputGone && !(chat.framed && chat.answer.moving !== null);
  const inputTop = inputGone ? lift : AI_INPUT.bottom + lift + inputHeight;
  return (
    <>
      {!chat.shown && !chat.framed && !cardShown ? <EverydayBottom {...props} keyboardUp={keyboardUp} /> : null}
      {chat.sheet(inputTop)}
      <RowFourProvider control={chat}>
        <AnswerFrame control={chat} inputTop={inputTop} keyboardUp={keyboardUp} onHeight={onAnswerHeight} room={room} />
      </RowFourProvider>
      {invitation.shown ? <InvitationFrame invitation={invitation} onHeight={onAnswerHeight} room={room} /> : null}
      {made.shown === null ? null : (
        <MadeQuestFrame made={made.shown} onClose={made.closeCard} onHeight={onAnswerHeight} room={room} />
      )}
      {inputShown && !cardShown ? (
        <AiInput
          chatOpen={chat.shown}
          lift={lift}
          onHeight={setInputHeight}
          onOpen={chat.open}
          placeholder={chat.framed ? '이어서 말하기' : undefined}
          restore={restoreOf(chat.chat.bubbles)}
          onSend={chat.onMap ? sendWithKeyboardDown(chat.chat.send) : chat.chat.send}
          waiting={chat.chat.waiting}
        />
      ) : null}
      <TutorialPager flow={tutorial} />
      <TutorialSheet
        flow={tutorial}
        onAskAssistant={(words) => {
          tutorial.closeSheet();
          chat.open();
          chat.chat.send(words);
        }}
        onShowOnMap={(target) => {
          tutorial.closeSheet();
          onShowOnMap(target);
        }}
      />
    </>
  );
}
