/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type QuestRoundTone, questTone } from '@/design-system';
import type { QuestRowView } from '@/features/quests/adapter';

// The rows of the main screen's Quest list: today's Quests. The 새내기 튜토리얼's quests are not on it (MainTutorialList).

// What a row shows: the kicker in the colour of its tone, the title, the line under it, and its round.
export interface RowLook {
  id: string;
  kicker: string;
  title: string;
  meta: string;
  tone: QuestRoundTone;
  kickerColor: string;
  onPress: () => void;
}

export function questRows(rows: readonly QuestRowView[], press: (row: QuestRowView) => void): RowLook[] {
  return rows.map((row) => ({
    ...row,
    kickerColor: questTone[row.tone].kicker,
    onPress: () => {
      press(row);
    },
  }));
}
