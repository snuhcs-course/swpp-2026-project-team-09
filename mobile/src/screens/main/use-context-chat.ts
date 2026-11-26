/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RefObject, useCallback, useRef } from 'react';
import type { RequestContext } from '@/api/assistant-types';
import type { Tapped } from '@/api/lookup-types';
import type { Viewport } from '@/features/assistant/study-area';
import { type Chat, useChat } from '@/features/assistant/use-chat';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { ChatSheetControl } from './chat-sheet';
import type { Me } from './use-me';

// Where the User is on campus, or why that is not known.
export type Where = Pick<Me, 'position' | 'locationMissing'>;

interface Pressed {
  tapped: Tapped | null;
  viewport: Viewport | null;
}

// What the app knows when the User asks: where the User is on campus or why that is not known, what was pressed on
// the map and the map's visible area, and the conditions and the Plan of the answer on screen.
function contextAt(where: Where, shown: ShownAnswer | null, { tapped, viewport }: Pressed): RequestContext {
  const { position, locationMissing } = where;
  const conditions = shown?.answer?.input ?? null;
  const planId = shown?.plan?.id ?? null;
  const listed = conditions?.kind === 'meal' ? shown?.answer?.plans.map(({ id }) => id) : undefined;
  const planIds = listed === undefined || listed.length === 0 ? {} : { planIds: listed };
  return { location: position, locationMissing, viewport, tapped, conditions, planId, ...planIds };
}

// The conversation, whose requests carry the context: the answer on screen kept in `shownNow`, what was pressed on the
// map, which `setTapped` keeps, and the map's visible area, which `setViewport` keeps.
export function useContextChat(
  where: Where,
  shownNow: RefObject<ShownAnswer | null>,
): { chat: Chat } & Pick<ChatSheetControl, 'setTapped' | 'setViewport'> {
  const pressedNow = useRef<Pressed>({ tapped: null, viewport: null });
  const chat = useChat((): RequestContext => contextAt(where, shownNow.current, pressedNow.current));
  const setTapped = useCallback((tapped: Tapped | null): void => {
    pressedNow.current = { ...pressedNow.current, tapped };
  }, []);
  const setViewport = useCallback((viewport: Viewport | null): void => {
    pressedNow.current = { ...pressedNow.current, viewport };
  }, []);
  return { chat, setTapped, setViewport };
}
