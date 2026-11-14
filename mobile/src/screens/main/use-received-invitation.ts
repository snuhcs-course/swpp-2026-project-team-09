/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { InvitationCard } from '@/api/invitation-card-types';
import type { LatLng } from '@/api/types';
import { useToast } from '@/design-system';
import { type AnswerDrawing, drawingOfScene } from '@/features/assistant/answer-marks';
import { cardId, invitationIdOf } from '@/features/map/adapter';
import { type PartyActions, usePartyActions } from '../party/use-party-actions';
import { useHideTabBarOnMain } from '../shell/main-tab-bar';
import type { Selection } from './use-selection';

export interface ReceivedInvitation {
  // The card of a received invitation is on screen.
  shown: boolean;
  // Null while it is read, or when the read failed.
  card: InvitationCard | null;
  failed: boolean;
  retry: () => void;
  // The invitee's own way, null without one.
  drawing: AnswerDrawing | null;
  // 수락 or 거절 of this invitation is on its way: neither takes a press.
  busy: boolean;
  accept: () => void;
  decline: () => void;
  close: () => void;
}

const CARD_KEY = 'invitation-card';
const GONE = '이미 끝난 초대예요';
const DECLINED = '초대를 거절했어요';

// The invitation's card is read with the User's position at that moment, while the User is on campus.
function useCardRead(invitationId: string | null, position: LatLng | null): UseQueryResult<InvitationCard> {
  const where = useRef(position);
  useEffect(() => {
    where.current = position;
  });
  return useQuery({
    queryKey: [CARD_KEY, invitationId],
    queryFn: () => apiClient.getInvitationCard(invitationId ?? '', where.current),
    enabled: invitationId !== null,
  });
}

// 수락 and 거절, each as the 파티 tab's buttons do it, once for each invitation at a time. Done, the toast says so, and
// the card closes while that invitation's card is still the one selected (`selectedId`, a card's id).
function useAnswers(
  card: InvitationCard | null,
  selectedId: string | null,
  closeCard: () => void,
): Pick<ReceivedInvitation, 'busy' | 'accept' | 'decline'> {
  const actions = usePartyActions();
  const showToast = useToast();
  const [sending, setSending] = useState<readonly string[]>([]);
  const going = useRef(new Set<string>());
  const selected = useRef(selectedId);
  useEffect(() => {
    selected.current = selectedId;
  });
  const answer = async (does: PartyActions['accept'], done: string | null): Promise<void> => {
    if (card === null || going.current.has(card.id)) {
      return;
    }
    const { id } = card;
    going.current.add(id);
    setSending((ids) => [...ids, id]);
    const answered = await does(card);
    going.current.delete(id);
    setSending((ids) => ids.filter((each) => each !== id));
    if (!answered) {
      return;
    }
    if (done !== null) {
      showToast(done);
    }
    if (selected.current === cardId.invitation(id)) {
      closeCard();
    }
  };
  return {
    busy: card !== null && sending.includes(card.id),
    accept: () => void answer(actions.accept, null),
    decline: () => void answer(actions.decline, DECLINED),
  };
}

// The invitation the User received whose card is selected, shown while the answer frame is not: its card, read
// from the main server, and the invitee's own way drawn. An invitation that waits no more closes with a toast.
export function useReceivedInvitation(
  selection: Selection,
  position: LatLng | null,
  framed: boolean,
): ReceivedInvitation {
  const { selected, close } = selection;
  const selectedId = selected?.id ?? null;
  const invitationId = selectedId === null || framed ? null : invitationIdOf(selectedId);
  const read = useCardRead(invitationId, position);
  const showToast = useToast();
  const gone = read.error instanceof ApiError && read.error.status === 404;
  useEffect(() => {
    if (gone) {
      showToast(GONE);
      close();
    }
  }, [gone, showToast, close]);
  const card = invitationId === null ? null : (read.data ?? null);
  const way = card?.way ?? null;
  const drawing = useMemo(() => (way === null ? null : drawingOfScene(way.scene)), [way]);
  const answers = useAnswers(card, selectedId, close);
  return {
    shown: invitationId !== null,
    card,
    failed: read.isError && !gone,
    retry: () => void read.refetch(),
    drawing,
    ...answers,
    close,
  };
}

// The received invitation, and whether the answer frame or its card is shown, which the tab bar gives way to.
export function useFramed(
  selection: Selection,
  position: LatLng | null,
  chatFramed: boolean,
): { invitation: ReceivedInvitation; framed: boolean } {
  const invitation = useReceivedInvitation(selection, position, chatFramed);
  const framed = chatFramed || invitation.shown;
  useHideTabBarOnMain(framed);
  return { invitation, framed };
}
