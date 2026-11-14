/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import type { PlacePoint } from '@/api/assistant-types';
import type { Lookup, LookupAction } from '@/api/lookup-types';
import type { LatLng } from '@/api/types';
import type { ChatBubble } from './use-chat';
import { lastReply } from './use-shown-answer';

// Starts today's route guidance to a place, as a card's "길찾기" does, and tells whether it started.
export type StartGuidance = (place: { title: string; position: LatLng }) => boolean;

export type GuideAction = Extract<LookupAction, { kind: 'guide' }>;

export interface ShownLookup {
  // The Lookup of the conversation's last reply, or null: the frame's card finds its bubble by it.
  lookup: Lookup | null;
  basisOpen: boolean;
  toggleBasis: () => void;
  // "길 안내": starts the route guidance to the Place, and closes the answer once it started, so that the everyday map
  // shows the route.
  guide: (to: PlacePoint) => void;
}

// A way that is late opens with its basis shown, as boards q3 and q7 do: the clock and the walk say why.
export function opensBasis(lookup: Lookup | null): boolean {
  return lookup?.scene.flags.some(({ role }) => role === 'late') ?? false;
}

// The card's main button: the first action the app draws. A leave-by notification and "만나고 싶다" are not drawn
// until their screens exist (package D's notification, package B's "만나고 싶다").
export function mainActionOf({ actions }: Lookup): GuideAction | null {
  return actions.find((action): action is GuideAction => action.kind === 'guide') ?? null;
}

// The Lookup of the conversation's last reply, and whether its basis is open: as `opensBasis` says when the reply
// comes, turned by "근거" and "근거 접기" after that.
export function useShownLookup(bubbles: readonly ChatBubble[], start: StartGuidance, close: () => void): ShownLookup {
  const reply = lastReply(bubbles);
  const lookup = reply?.lookup ?? null;
  const replyId = reply?.id ?? null;
  // The reply whose basis was turned from how it opened.
  const [turned, setTurned] = useState<number | null>(null);
  return {
    lookup,
    basisOpen: opensBasis(lookup) !== (replyId !== null && turned === replyId),
    toggleBasis: () => {
      setTurned((last) => (last === replyId ? null : replyId));
    },
    guide: ({ label, latitude, longitude }) => {
      if (start({ title: label, position: { latitude, longitude } })) {
        close();
      }
    },
  };
}
