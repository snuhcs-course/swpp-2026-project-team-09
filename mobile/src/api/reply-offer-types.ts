/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LeaveQuestOffer } from './leave-quest-types';
import type { QuestOffer } from './party-change-types';
import type { RefusalOffer } from './refusal-types';

// A button under a reply's text: one sent as the User's words, one that cancels a Quest (P04 ticket 24), or one that
// opens a 파티's room (ticket 25).
export type AskOffer = Extract<RefusalOffer, { kind: 'ask' }>;

export type ReplyOffer = AskOffer | LeaveQuestOffer | QuestOffer;
