/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RefObject, useCallback, useRef } from 'react';
import type { RequestContext } from '@/api/assistant-types';
import type { Tapped } from '@/api/lookup-types';
import type { LatLng } from '@/api/types';
import type { Viewport } from '@/features/assistant/study-area';
import { type Chat, useChat } from '@/features/assistant/use-chat';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { ChatSheetControl } from './chat-sheet';

interface Pressed {
  tapped: Tapped | null;
  viewport: Viewport | null;
}

// What the app knows when the User asks: where the User is on campus, what was pressed on the map and the map's
// visible area, and the conditions and the Plan of the answer on screen.
function contextAt(position: LatLng | null, shown: ShownAnswer | null, { tapped, viewport }: Pressed): RequestContext {
  const conditions = shown?.answer?.input ?? null;
  const planId = shown?.plan?.id ?? null;
  return { location: position, viewport, tapped, conditions, planId };
}

// The conversation, whose requests carry the context while the switch is on: the answer on screen kept in `shownNow`,
// what was pressed on the map, which `setTapped` keeps, and the map's visible area, which `setViewport` keeps.
export function useContextChat(
  onMap: boolean,
  position: LatLng | null,
  shownNow: RefObject<ShownAnswer | null>,
): { chat: Chat } & Pick<ChatSheetControl, 'setTapped' | 'setViewport'> {
  const pressedNow = useRef<Pressed>({ tapped: null, viewport: null });
  const chat = useChat(
    onMap ? (): RequestContext => contextAt(position, shownNow.current, pressedNow.current) : undefined,
  );
  const setTapped = useCallback((tapped: Tapped | null): void => {
    pressedNow.current = { ...pressedNow.current, tapped };
  }, []);
  const setViewport = useCallback((viewport: Viewport | null): void => {
    pressedNow.current = { ...pressedNow.current, viewport };
  }, []);
  return { chat, setTapped, setViewport };
}
