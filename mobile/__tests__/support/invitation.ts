/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { InvitationCard } from '@/api/invitation-card-types';
import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import type { QuestInvitation } from '@/api/waiting-types';
import { pass, screen } from './app';
import type { FakeServer, Reply } from './fake-server';
import { RECEIVED } from './invitation-cards';

// A received invitation opened on the main screen (P02 ticket 06), against the fake main server.

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

// A second invitation: the stored card with its id changed, for the boundary of two invitations at once.
export const SECOND_CARD: InvitationCard = { ...INVITATION_CARD, id: '2a6f0b8e-5d1c-4c3a-9e7f-1b2c3d4e5f60' };
export const SECOND_RECEIVED: QuestInvitation = { ...RECEIVED, id: SECOND_CARD.id };
export const SECOND_CARD_ROUTE = `GET /quest-invitations/${SECOND_CARD.id}`;

// The main server lists both invitations and answers each one's card.
export function answerTwoInvitations(server: FakeServer): void {
  server.on('GET /quest-invitations', { status: 200, body: [RECEIVED, SECOND_RECEIVED] });
  server.on(CARD_ROUTE, STORED);
  server.on(SECOND_CARD_ROUTE, { status: 200, body: SECOND_CARD });
}

// Opens the invitation's card by the main screen's address, as a tapped push or a row of 알림 does.
export async function openInvitation(invitationId = INVITATION_CARD.id): Promise<void> {
  await act(() => {
    router.navigate(`/main?card=invitation:${invitationId}`);
  });
  await pass(500);
}

export function invitationCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('invitation-card'));
}
