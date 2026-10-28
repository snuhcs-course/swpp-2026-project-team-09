/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router, useIsFocused } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { now } from '@/clock';
import { space } from '@/design-system';
import { nextMeal } from '@/features/dining/adapter';
import type { CardView } from '@/features/map/adapter';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { tabBarHeight } from '../shell/layout';
import { AiInput } from './ai-input';
import { BottomControls } from './bottom-controls';
import { useChatSheet } from './chat-sheet';
import type { ChatFrom } from './chat-suggestion';
import { LayerControls, type LayerStack } from './layers';
import { AI_INPUT, CARD, LAYERS_BUTTON, type Room } from './layout';
import { ShuttleNotice } from './shuttle-notice';

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
// the bar, the navigation with the phone's own bar, which the keyboard covers. 0 while it is down.
function useKeyboardLift(): number {
  const { bottom } = useSafeAreaInsets();
  return Math.max(0, useKeyboardHeight(bottom) - tabBarHeight(bottom));
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
  // "활성 파티": the room of the User's Party's Quest.
  onParty: () => void;
  room: Room;
  stack: LayerStack;
  chatFrom: ChatFrom;
}

// What is at the bottom of the map: the shuttle's notice, the row of buttons, the 편의기능 button and the AI input. A
// card at the bottom hides the row and the button; the notice hides the row, and the button stands above it. The AI
// input opens the chat's sheet, which hides the rest and lies under the input: the input stays, as the chat's own,
// in the same place in the tree, so that it keeps the focus. While the keyboard is up, the input stands right above
// it, and the chat keeps its last bubble clear of it there. The conversation is kept while the app runs.
export function MapBottom(props: MapBottomProps): ReactElement {
  const { taken, onParty, onNoticeHeight, room, stack, chatFrom } = props;
  const chat = useChatSheet(useIsFocused(), stack.turnOn, chatFrom);
  const [inputHeight, setInputHeight] = useState<number>(AI_INPUT.height);
  const lift = useKeyboardLift();
  const { bottomCard, notice } = taken;
  const under = !chat.shown;
  return (
    <>
      {under && notice !== null ? <ShuttleNotice onHeight={onNoticeHeight} serviceHours={notice} /> : null}
      {under ? <BottomControls cardOpen={bottomCard || notice !== null} onActiveParty={onParty} room={room} /> : null}
      {under && !bottomCard ? (
        <LayerControls lift={notice === null ? 0 : liftOver(room.cardHeight)} onMenus={openMenus} stack={stack} />
      ) : null}
      {chat.sheet(AI_INPUT.bottom + lift + inputHeight)}
      <AiInput
        chatOpen={chat.shown}
        lift={lift}
        onHeight={setInputHeight}
        onOpen={chat.open}
        onSend={chat.chat.send}
        placeholder={chat.placeholder}
        waiting={chat.chat.waiting}
      />
    </>
  );
}
