/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Mention } from '@/api/mention-types';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { tabBarHeight } from '../shell/layout';
import type { ChatSheetControl } from './chat-sheet';

// The AI input's keyboard at the map's bottom, moved out of `map-bottom.tsx` (A04 ticket 09).

// How much higher the AI input stands while the keyboard is up: the keyboard's reach less what already lies under
// the bar, the navigation with the phone's own bar, which the keyboard covers. 0 while it is down. While the answer
// frame is shown the navigation gives way, and the bar stands above the phone's own bar or the keyboard.
export function useKeyboardLift(framed: boolean): { lift: number; keyboardUp: boolean } {
  const { bottom } = useSafeAreaInsets();
  const keyboard = useKeyboardHeight(bottom);
  const lift = framed ? Math.max(bottom, keyboard) : Math.max(0, keyboard - tabBarHeight(bottom));
  return { lift, keyboardUp: keyboard > 0 };
}

// A send puts the keyboard down, so that the frame's card shows the reply.
export function sendWithKeyboardDown(
  send: ChatSheetControl['chat']['send'],
): (text: string, mentions?: readonly Mention[]) => void {
  return (text, mentions) => {
    Keyboard.dismiss();
    send(text, undefined, mentions?.length === 0 ? undefined : mentions);
  };
}
