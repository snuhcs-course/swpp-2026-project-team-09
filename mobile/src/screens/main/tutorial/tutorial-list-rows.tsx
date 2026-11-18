/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tutorial, TutorialQuest } from '@/api/tutorial-types';
import { color, font, Icon, iconOrFlag, radius, space, type TutorialCategoryTone, tutorialTone } from '@/design-system';
import { toneOf } from './tone';
import type { ShownList as Shown, TutorialFlow } from './use-tutorial-flow';

// The tabs and the rows of the tutorial's list (MainTutorialPager).

const TILE = 52;
const BADGE = 18;

// The Tutorial Categories' tabs, each with its colour's dot; the shown one filled with its soft colour.
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
    <View accessibilityRole="tablist" style={styles.tabs}>
      {tutorial.categories.map(({ key, label }) => {
        const on = key === shown.category;
        const tone = toneOf(tutorial, key);
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            key={key}
            onPress={() => {
              flow.showCategory(key);
            }}
            style={[styles.tab, on ? { backgroundColor: tone.soft } : styles.tabOff]}
          >
            <View style={[styles.tabDot, { backgroundColor: tone.ink }]} />
            <Text style={[styles.tabWords, { color: on ? tone.ink : color.inkMuted }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface RowProps {
  quest: TutorialQuest;
  tone: TutorialCategoryTone;
  next: boolean;
  onPress: () => void;
}

// A quest: its icon on its category's tile, its title with ✓ once completed, "진행 중" or "다음", and the chevron.
export function QuestRow({ quest, tone, next, onPress }: RowProps): ReactElement {
  const done = quest.status === 'completed';
  const started = quest.status === 'started';
  const tag = next ? '다음' : started ? '진행 중' : null;
  return (
    <Pressable
      accessibilityLabel={`${quest.title}${done ? ' · 완료' : started ? ' · 진행 중' : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.row,
        next
          ? { borderWidth: 2, borderColor: tone.ink, backgroundColor: tone.soft }
          : started && { borderColor: `${tone.ink}55` },
      ]}
    >
      <View style={[styles.tile, { backgroundColor: tone.soft }, done && styles.faded]}>
        <Icon color={tone.ink} name={iconOrFlag(quest.icon)} size={24} />
      </View>
      <View style={styles.rowWords}>
        <Text style={styles.rowTitle}>{quest.title}</Text>
        {done ? (
          <View style={styles.badge}>
            <Icon color={color.onPrimary} name="check" size={12} />
          </View>
        ) : null}
      </View>
      {tag === null ? null : (
        <Text style={[styles.tag, next ? styles.tagNext : { backgroundColor: tone.soft, color: tone.ink }]}>{tag}</Text>
      )}
      <Icon color={tutorialTone.faint} name="chevronRight" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.full,
  },
  tabOff: { borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  tabDot: { width: space[2], height: space[2], borderRadius: radius.full },
  tabWords: { fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: 10,
    borderWidth: 1,
    borderColor: tutorialTone.idle,
    borderRadius: 18,
    backgroundColor: color.surface,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    width: TILE,
    height: TILE,
    borderRadius: radius.lg,
  },
  faded: { opacity: 0.55 },
  rowWords: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { flexShrink: 1, fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: color.ink },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BADGE,
    height: BADGE,
    borderRadius: radius.full,
    backgroundColor: tutorialTone.done,
  },
  tag: {
    overflow: 'hidden',
    height: 22,
    paddingHorizontal: space[2],
    borderRadius: radius.full,
    fontFamily: font.bold,
    fontSize: 11,
    lineHeight: 22,
  },
  tagNext: { backgroundColor: color.snuBlue, color: color.onPrimary },
});
