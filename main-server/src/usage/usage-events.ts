/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { JoinPolicy } from '../generated/prisma/client.js';

// The main server's usage events, the closing stage of four actions (README.md: Usage data), each with the only
// properties it may carry. The service adds `source: 'server'` to every one; nothing else is sent.
export interface UsageEvents {
  // The Assistant answered POST /assistant/messages with 200.
  assistant_reply_completed: Record<string, never>;
  // A 파티 was stored: the form's Quest, a Global Event's new Quest, or a Plan's Quest that is not taken alone.
  party_creation_completed: { visibility: PartyVisibility };
  // The User was stored as a Holder; for an accepted join request, the User who asked.
  party_join_completed: { how: 'joined_directly' | 'invitation_accepted' | 'request_accepted' };
  // A friendship was stored; sent once for each of the two Users.
  friendship_creation_completed: { how: FriendshipHow };
}

export type FriendshipHow = 'request_accepted' | 'invite_link_accepted' | 'requests_crossed';

export type UsageEvent = keyof UsageEvents;

// `public` for an Open or Approval Quest, `private` for a Closed one.
export type PartyVisibility = 'public' | 'private';

export function visibilityOf(joinPolicy: JoinPolicy): PartyVisibility {
  return joinPolicy === JoinPolicy.closed ? 'private' : 'public';
}
