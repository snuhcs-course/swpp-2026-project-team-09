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
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { now } from '@/clock';
import { space } from '@/design-system';
import { nextMeal } from '@/features/dining/adapter';
import type { CardView } from '@/features/map/adapter';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { tabBarHeight } from '../shell/layout';
import { AiInput } from './ai-input';
import { AnswerFrame } from './answer/answer-frame';
import { BottomControls } from './bottom-controls';
import type { ChatSheetControl } from './chat-sheet';
import { LayerControls, type LayerStack } from './layers';
import { AI_INPUT, CARD, LAYERS_BUTTON, type Room } from './layout';
import { ShuttleNotice } from './shuttle-notice';
import { TutorialPager } from './tutorial/tutorial-pager';
import { TutorialSheet } from './tutorial/tutorial-sheet';
import { TutorialStartButton } from './tutorial/tutorial-start-button';
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

// What the open card and the shuttle's notice take. A 식당's card sits at the top: the lists give way to it, and what
// is at the bottom stays. The notice, the shuttle's service hours, gives way to any open card; what a card at the
// bottom hides gives way to the notice too, and the 편의기능 button stands above it.
export interface Taken {
  topCard: boolean;
  bottomCard: boolean;
  notice: string | null;
}

export function takenBy(selected: CardView | null, serviceHours: string | null): Taken {
  const topCard = selected?.kind === 'dining';
  return { topCard, bottomCard: selected !== null && !topCard, notice: selected === null ? serviceHours : null };
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
}

// What is at the bottom of the map: the shuttle's notice, the row of buttons, the 편의기능 button and the AI input. A
// card at the bottom hides the row and the button; the notice hides the row, and the button stands above it. The AI
// input opens the chat's sheet, which hides the rest and lies under the input: the input stays, as the chat's own,
// in the same place in the tree, so that it keeps the focus. While the keyboard is up, the input stands right above
// it, and the chat keeps its last bubble clear of it there. The conversation is kept while the app runs.
// With the switch of the answer on the map on, the answer frame takes the sheet's place, and the input is its card's.
export function MapBottom(props: MapBottomProps): ReactElement {
  const { taken, onParty, onNoticeHeight, onAnswerHeight, room, stack, tutorial, onShowOnMap, chat } = props;
  const [inputHeight, setInputHeight] = useState<number>(AI_INPUT.height);
  const { lift, keyboardUp } = useKeyboardLift(chat.framed);
  const { bottomCard, notice } = taken;
  const under = !chat.shown && !chat.framed;
  const inputTop = AI_INPUT.bottom + lift + inputHeight;
  return (
    <>
      {under && notice !== null ? <ShuttleNotice onHeight={onNoticeHeight} serviceHours={notice} /> : null}
      {under ? <BottomControls cardOpen={bottomCard || notice !== null} onActiveParty={onParty} room={room} /> : null}
      {under && !bottomCard ? (
        <LayerControls lift={notice === null ? 0 : liftOver(room.cardHeight)} stack={stack} />
      ) : null}
      {under && room.tutorialStart ? <TutorialStartButton onPress={tutorial.openPager} /> : null}
      {chat.sheet(inputTop)}
      <AnswerFrame control={chat} inputTop={inputTop} keyboardUp={keyboardUp} onHeight={onAnswerHeight} room={room} />
      <AiInput
        chatOpen={chat.shown}
        lift={lift}
        onHeight={setInputHeight}
        onOpen={chat.open}
        placeholder={chat.framed ? '이어서 말하기' : undefined}
        onSend={chat.onMap ? sendWithKeyboardDown(chat.chat.send) : chat.chat.send}
        waiting={chat.chat.waiting}
      />
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
