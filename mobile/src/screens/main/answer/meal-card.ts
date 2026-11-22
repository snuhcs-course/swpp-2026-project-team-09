/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ChatSheetControl } from '../chat-sheet';

// A restaurant's menu opened from the map ("메뉴 ›" on the chosen place's label): that place chosen, and the card
// raised to its menu (board E4).
export function openMealMenu(control: Pick<ChatSheetControl, 'answer' | 'card'>, planId: string): void {
  control.answer.openMenu(planId);
  control.card.setRaised(true);
}
