/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Tutorial } from '@/api/tutorial-types';
import { type IconName, questTone, tutorialTone } from '@/design-system';
import type { QuestRowView } from '@/features/quests/adapter';
import { kickerOf, questsInList } from '@/features/tutorial/rules';

// The rows of the main screen's Quest list: the started tutorial quests on top, then today's Quests.

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

// The started tutorial quests' rows (MainTutorialList): "새내기 튜토리얼 · {category} · n/N", the title and its 완료 조건.
export function tutorialRows(tutorial: Tutorial | undefined, onTutorial: (key: string) => void): RowLook[] {
  return questsInList(tutorial).map((quest) => ({
    id: `tutorial-${quest.key}`,
    kicker: tutorial === undefined ? '' : kickerOf(tutorial, quest),
    title: quest.title,
    meta: `완료 조건 · ${quest.condition}`,
    icon: 'flag',
    tint: tutorialTone.ink,
    onPress: () => {
      onTutorial(quest.key);
    },
  }));
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
