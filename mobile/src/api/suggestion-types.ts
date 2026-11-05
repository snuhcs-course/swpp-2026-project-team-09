/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { QuestProposal } from './assistant-types';

// --- The grey suggestion of the empty chat (GET /assistant/suggestion) ---

// What a tap on a suggestion runs, without the model: a Proposal shown as the Assistant's, or the walking route to a
// Place of the campus.
export type SuggestionAction =
  { type: 'proposal'; proposal: QuestProposal } | { type: 'route'; placeId: string; name: string };

// A request the main server thinks fits the moment: `text` as the User might ask it ("민수랑 점심 어때요?") and
// `reason`, the one line why ("공강 시작 · 민수도 공강"). `id` is the impression's, which an outcome names.
export interface ChatSuggestion {
  id: string;
  text: string;
  reason: string;
  action: SuggestionAction;
}

// Where the chat opened: the screen, and the Global Event whose card is open there, if any.
export interface SuggestionContext {
  screen: 'main' | 'events' | 'party';
  openEventId: string | null;
}

// What the User did with a suggestion: tapped it, dismissed it with ×, or made its Proposal's Quest.
export type SuggestionOutcome = { outcome: 'accepted' | 'dismissed' } | { outcome: 'confirmed'; questId: string };
