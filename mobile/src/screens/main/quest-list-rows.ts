/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type IconName, questTone } from '@/design-system';
import type { QuestRowView } from '@/features/quests/adapter';

// The rows of the main screen's Quest list: today's Quests. The 새내기 튜토리얼's quests are not on it (MainTutorialList).

// What a row shows: the kicker, the title and the line under it, in the colour of its tone, and the icon in its round.
export interface RowLook {
  id: string;
  kicker: string;
  title: string;
  meta: string;
  icon: IconName;
  tint: string;
  onPress: () => void;
}

export function questRows(rows: readonly QuestRowView[], press: (row: QuestRowView) => void): RowLook[] {
  return rows.map((row) => ({
    ...row,
    tint: questTone[row.tone],
    onPress: () => {
      press(row);
    },
  }));
}
