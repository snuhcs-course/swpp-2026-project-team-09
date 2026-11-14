/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/api/errors';
import type { InvitationCard } from '@/api/invitation-card-types';
import { invitationCardQuery, QUEST_INVITATIONS_KEY } from '@/api/queries';
import type { LatLng } from '@/api/types';
import { useToast } from '@/design-system';
import { type AnswerDrawing, drawingOfScene } from '@/features/assistant/answer-marks';
import { useAnswerSwitch } from '@/features/assistant/answer-switch';
import { type CardView, cardId, invitationIdOf } from '@/features/map/adapter';
import { type PartyActions, usePartyActions } from '../party/use-party-actions';
import { useHideTabBarOnMain } from '../shell/main-tab-bar';
import type { Me } from './use-me';
import type { Selection } from './use-selection';

export interface ReceivedInvitation {
  // The card of a received invitation is on screen.
  shown: boolean;
  // Null while it is read, or when the read failed.
  card: InvitationCard | null;
  failed: boolean;
  retry: () => void;
  // The phone told a position outside the campus rectangle, from where the app sends none.
  offCampus: boolean;
  // The invitee's own way, null without one.
  drawing: AnswerDrawing | null;
  // 수락 or 거절 of this invitation is on its way: neither takes a press.
  busy: boolean;
  accept: () => void;
  decline: () => void;
  close: () => void;
}

export const INVITATION_GONE = '이미 끝난 초대예요';
const DECLINED = '초대를 거절했어요';

// The invitation's card is read with the User's position at that moment, while the User is on campus.
function useCardRead(invitationId: string | null, position: LatLng | null): UseQueryResult<InvitationCard> {
  const where = useRef(position);
  useEffect(() => {
    where.current = position;
  });
  return useQuery({
    ...invitationCardQuery(invitationId ?? '', () => where.current),
    enabled: invitationId !== null,
  });
}

// The selected invitation's card left the cards while the switch stayed on: the list of invitations came again
// without it, as after the Leader cancelled it or it was answered on another device. The selection drops the card
// itself. `selectedId` is the selected invitation's card id.
function useEndedOnList(selectedId: string | null, cards: readonly CardView[]): void {
  const on = useAnswerSwitch();
  const showToast = useToast();
  const before = useRef(selectedId);
  useEffect(() => {
    const was = before.current;
    before.current = selectedId;
    if (on && was !== null && was !== selectedId && !cards.some(({ id }) => id === was)) {
      showToast(INVITATION_GONE);
    }
  }, [selectedId, cards, on, showToast]);
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

// A read refused with 404: the invitation waits no more. The card closes with a toast, and the list of invitations is
// read again, so that the invitation leaves the 파티 tab and the cards.
function useGoneOnRead(gone: boolean, closeCard: () => void): void {
  const queryClient = useQueryClient();
  const showToast = useToast();
  useEffect(() => {
    if (gone) {
      showToast(INVITATION_GONE);
      closeCard();
      void queryClient.invalidateQueries({ queryKey: QUEST_INVITATIONS_KEY, exact: true });
    }
  }, [gone, showToast, closeCard, queryClient]);
}

// The invitation the User received whose card is selected, shown while the answer frame is not: its card, read
// from the main server, and the invitee's own way drawn. An invitation that waits no more closes with a toast.
export function useReceivedInvitation(
  selection: Selection,
  cards: readonly CardView[],
  { position, offCampus }: Pick<Me, 'position' | 'offCampus'>,
  framed: boolean,
): ReceivedInvitation {
  const { selected, close } = selection;
  const selectedId = selected?.id ?? null;
  const selectedInvitation = selectedId === null ? null : invitationIdOf(selectedId);
  const invitationId = framed ? null : selectedInvitation;
  const read = useCardRead(invitationId, position);
  const gone = read.error instanceof ApiError && read.error.status === 404;
  useGoneOnRead(gone, close);
  useEndedOnList(selectedInvitation === null ? null : selectedId, cards);
  const card = invitationId === null ? null : (read.data ?? null);
  const way = card?.way ?? null;
  const drawing = useMemo(() => (way === null ? null : drawingOfScene(way.scene)), [way]);
  const answers = useAnswers(card, selectedId, close);
  return {
    shown: invitationId !== null,
    card,
    failed: read.isError && !gone,
    retry: () => void read.refetch(),
    offCampus,
    drawing,
    ...answers,
    close,
  };
}

// The received invitation, and whether the answer frame or its card is shown, which the tab bar gives way to.
export function useFramed(
  selection: Selection,
  cards: readonly CardView[],
  me: Pick<Me, 'position' | 'offCampus'>,
  chatFramed: boolean,
): { invitation: ReceivedInvitation; framed: boolean } {
  const invitation = useReceivedInvitation(selection, cards, me, chatFramed);
  const framed = chatFramed || invitation.shown;
  useHideTabBarOnMain(framed);
  return { invitation, framed };
}
