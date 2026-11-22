/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { SubQuestContent } from './room-types';

// A 파티 already made, changed in place from the Assistant (P04 ticket 25), sent only to an app that says
// `party-change`. 바꾸기 sends `step` as it is to the room's 일정 수정, PUT /quests/{questId}/sub-quests/{subQuestId};
// `told` is how many other Holders that tells.
export interface ProposalChange {
  questId: string;
  subQuestId: string;
  // The main server's own body of that request, sent back untouched.
  step: SubQuestContent;
  told: number;
}

// A change the Assistant cannot make (the title, the size, the invited Friends): 파티 수정하기 opens the 파티's room.
export interface QuestOffer {
  kind: 'quest';
  label: string;
  questId: string;
}
