/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import type { QuestInvitation } from '@/api/waiting-types';
import { pass, screen } from './app';
import type { FakeServer, Reply } from './fake-server';

// A received invitation opened on the main screen (P02 ticket 06), against the fake main server.

// The invitation as the list of received invitations gives it: the stored card's own id, Quest, and time.
export const RECEIVED: QuestInvitation = {
  id: INVITATION_CARD.id,
  quest: INVITATION_CARD.quest,
  sentAt: INVITATION_CARD.sentAt,
};

export const CARD_ROUTE = `GET /quest-invitations/${INVITATION_CARD.id}`;
export const ACCEPT_ROUTE = `POST /quest-invitations/${INVITATION_CARD.id}/accept`;
export const DECLINE_ROUTE = `POST /quest-invitations/${INVITATION_CARD.id}/decline`;

// The names a screen reader says for the marks of 민수's own way in the stored card.
export const OWN_WAY_MARKS = ['12:18 유상과 만남', '63동 · 12:33 학생회관식당에서 식사', '나 · 18분'];

const STORED: Reply = { status: 200, body: INVITATION_CARD };

// The main server lists the invitation and answers its card with `card`.
export function answerInvitation(server: FakeServer, card: Reply = STORED): void {
  server.on('GET /quest-invitations', { status: 200, body: [RECEIVED] });
  server.on(CARD_ROUTE, card);
}

// Opens the invitation's card by the main screen's address, as a tapped push or a row of 알림 does.
export async function openInvitation(): Promise<void> {
  await act(() => {
    router.navigate(`/main?card=invitation:${INVITATION_CARD.id}`);
  });
  await pass(500);
}

export function invitationCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('invitation-card'));
}
