/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// "저녁 약속 취소해 줘" (P04 ticket 24): the one button that cancels the Quest, `label` 취소하기 when nobody else holds it
// or 나가기 when others do, by DELETE /quests/{questId}. Its `title` and `startsAt` say on the button what it cancels.
export interface LeaveQuestOffer {
  kind: 'leave-quest';
  label: string;
  title: string;
  startsAt: string;
  questId: string;
}
