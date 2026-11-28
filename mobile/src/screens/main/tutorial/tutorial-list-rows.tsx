/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tutorial, TutorialQuest } from '@/api/tutorial-types';
import {
  Badge,
  ChipRow,
  color,
  font,
  Glass,
  Icon,
  iconOrFlag,
  radius,
  space,
  tutorialCategoryTone as tone,
  tutorialTone,
} from '@/design-system';
import type { ShownList as Shown, TutorialFlow } from './use-tutorial-flow';

// The tabs and the rows of the tutorial's list (P06 ticket 60): the 행사 tab's word tabs, and a card for each quest.

const TILE = 44;

// The Tutorial Categories' tabs, words as the 행사 tab's filters: the shown one bold in navy on light blue. They scroll
// sideways when they do not fit, so that none is squeezed.
export function CategoryTabs({
  tutorial,
  shown,
  flow,
}: {
  tutorial: Tutorial;
  shown: Shown;
  flow: TutorialFlow;
}): ReactElement {
  return (
    <View style={styles.tabs}>
      <ChipRow
        chips={tutorial.categories.map(({ key, label }) => ({ key, label }))}
        onSelect={flow.showCategory}
        selected={shown.category}
      />
    </View>
  );
}

interface RowProps {
  quest: TutorialQuest;
  next: boolean;
  onPress: () => void;
}

// The tag after a quest's title: 다음, 완료 in the 행사 tab's "내 파티" colours, or 진행 중.
function Tag({ quest, next }: Pick<RowProps, 'quest' | 'next'>): ReactElement | null {
  if (next) {
    return (
      <Badge icon={false} tone="official">
        다음
      </Badge>
    );
  }
  if (quest.status === 'completed') {
    return (
      <Badge icon={false} tone="friend">
        완료
      </Badge>
    );
  }
  return quest.status === 'started' ? <Badge>진행 중</Badge> : null;
}

// The card's ground: the panel's inner glass, or the light blue of the next quest, outlined.
function Ground({ next, children }: { next: boolean; children: ReactNode }): ReactElement {
  return next ? (
    <View style={[styles.row, styles.rowNext]}>{children}</View>
  ) : (
    <Glass level="inner" style={styles.row}>
      {children}
    </Glass>
  );
}

// A quest's card: its icon on the light blue tile, its title with its tag, its brief, and the chevron.
export function QuestRow({ quest, next, onPress }: RowProps): ReactElement {
  const done = quest.status === 'completed';
  const started = quest.status === 'started';
  return (
    <Pressable
      accessibilityLabel={`${quest.title}${done ? ' · 완료' : started ? ' · 진행 중' : ''}`}
      accessibilityRole="button"
      onPress={onPress}
    >
      <Ground next={next}>
        <View style={[styles.tile, done && styles.faded]}>
          <Icon color={tone.ink} name={iconOrFlag(quest.icon)} size={22} />
        </View>
        <View style={styles.rowWords}>
          <View style={styles.titleLine}>
            <Text style={styles.rowTitle}>{quest.title}</Text>
            <Tag next={next} quest={quest} />
          </View>
          <Text style={styles.brief}>{quest.brief}</Text>
        </View>
        <Icon color={tutorialTone.faint} name="chevronRight" size={20} />
      </Ground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The tabs span the panel, with their own room at the sides.
  tabs: { marginHorizontal: -space[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
  },
  rowNext: { borderWidth: 2, borderColor: tone.ink, backgroundColor: tone.soft },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    backgroundColor: tone.soft,
  },
  faded: { opacity: 0.55 },
  rowWords: { flex: 1, gap: 2 },
  // The title takes what the tag leaves and wraps there: a title in a wrapping row was cut on Android.
  titleLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  rowTitle: { flex: 1, fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: color.ink },
  brief: { fontFamily: font.medium, fontSize: 12, lineHeight: 17, color: color.inkMuted },
});
