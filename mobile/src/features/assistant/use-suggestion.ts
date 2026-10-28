/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import type { ChatSuggestion, SuggestionContext, SuggestionOutcome } from '@/api/suggestion-types';
import type { Chat } from './use-chat';

// The Assistant's words over a suggestion's Proposal, which no model wrote.
export const SUGGESTED = '이렇게 만들어 볼까요?';

export interface Suggestion {
  // The suggestion of this opening of the sheet while the chat is empty, or null.
  held: ChatSuggestion | null;
  // The sheet opened. Only the first call of an opening asks, and only on the empty chat.
  opened: (context: SuggestionContext) => void;
  // The sheet closed: the suggestion held, and one still on its way, are dropped.
  closed: () => void;
  // A tap: runs the action without the model.
  run: () => void;
  // ×.
  dismiss: () => void;
  // 만들기 on the Proposal card of this bubble made this Quest.
  made: (bubbleId: number, questId: string) => void;
}

type Held = Pick<Suggestion, 'held' | 'opened' | 'closed'> & { drop: () => void };

// An outcome only counts toward the main server's choice of suggestions, so one that does not reach it is let go.
function tell(suggestionId: string, outcome: SuggestionOutcome): void {
  void apiClient.sendSuggestionOutcome(suggestionId, outcome).catch(() => null);
}

// The suggestion asked for when the sheet opens on the empty chat, held while it stays open. One that cannot be had,
// from an older main server or with no network, is none, and nothing is said.
function useHeld(empty: boolean): Held {
  const [held, setHeld] = useState<ChatSuggestion | null>(null);
  // The opening of the sheet an answer is for; null while it is closed.
  const opening = useRef<number | null>(null);
  const openings = useRef(0);
  const opened = useCallback(
    (context: SuggestionContext): void => {
      if (opening.current !== null) {
        return;
      }
      openings.current += 1;
      const asked = openings.current;
      opening.current = asked;
      if (!empty) {
        return;
      }
      void apiClient.getChatSuggestion(context).then(
        (suggestion) => {
          if (opening.current === asked) {
            setHeld(suggestion);
          }
        },
        () => null,
      );
    },
    [empty],
  );
  const closed = useCallback((): void => {
    opening.current = null;
    setHeld(null);
  }, []);
  const drop = useCallback((): void => {
    setHeld(null);
  }, []);
  return { held, opened, closed, drop };
}

// The grey suggestion of the empty chat: asked for once each time the sheet opens on it, held until the User taps it,
// dismisses it or the sheet closes, and the tap, the dismissal and the Quest its Proposal made told to the main
// server. `walk` runs a route's action: it hides the sheet, which closes the opening here, and draws the way.
export function useSuggestion(
  chat: Pick<Chat, 'bubbles' | 'waiting' | 'propose'>,
  walk: (place: { placeId: string; name: string }) => void,
): Suggestion {
  const empty = chat.bubbles.length === 0 && !chat.waiting;
  const { held, opened, closed, drop } = useHeld(empty);
  // The suggestions whose Proposal a bubble shows, by the bubble's id.
  const proposed = useRef(new Map<number, string>());
  const run = (): void => {
    if (held === null) {
      return;
    }
    const { id, action } = held;
    drop();
    tell(id, { outcome: 'accepted' });
    if (action.type === 'proposal') {
      proposed.current.set(chat.propose(SUGGESTED, action.proposal), id);
    } else {
      closed();
      walk(action);
    }
  };
  const dismiss = (): void => {
    if (held !== null) {
      drop();
      tell(held.id, { outcome: 'dismissed' });
    }
  };
  const made = useCallback((bubbleId: number, questId: string): void => {
    const suggestionId = proposed.current.get(bubbleId);
    if (suggestionId !== undefined) {
      proposed.current.delete(bubbleId);
      tell(suggestionId, { outcome: 'confirmed', questId });
    }
  }, []);
  return { held: empty ? held : null, opened, closed, run, dismiss, made };
}
