/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { newIdempotencyKey } from '@/api/idempotency-key';
import { FRAMED_CHAT } from '@/api/mock/data/room-parts';
import type { PartyMessage } from '@/api/quest-parts-types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { keepPartyMessage, readPartyChat } from '@/storage/party-chat';
import type { Build } from './build';

// The mock adapter for a room's 파티 채팅, in both builds. What the User sends is kept on the phone for the signed-in
// User and nobody else sees it. The mock build starts the frame's room with the frame's conversation; the server
// build starts every room empty, so that no real member is shown saying invented words. Replaced once the main
// server carries the conversation.

// The conversation, the oldest first.
export async function chatOf(questId: string, build: Build): Promise<PartyMessage[]> {
  const framed = build === 'mock' ? (FRAMED_CHAT[questId] ?? []) : [];
  const kept = await readPartyChat(myUserId(), questId);
  return [...framed, ...kept.map(({ id, words, sentAt }) => ({ id, from: null, words, sentAt }))];
}

export async function sendChat(questId: string, words: string): Promise<PartyMessage> {
  const message = { id: `chat-${newIdempotencyKey()}`, words, sentAt: now().toISOString() };
  await keepPartyMessage(myUserId(), questId, message);
  return { ...message, from: null };
}
