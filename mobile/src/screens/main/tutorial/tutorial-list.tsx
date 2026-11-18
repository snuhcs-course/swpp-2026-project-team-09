/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tutorial } from '@/api/tutorial-types';
import {
  Button,
  color,
  font,
  Icon,
  Overlay,
  radius,
  shadow,
  size,
  space,
  type TutorialCategoryTone,
  tutorialTone,
} from '@/design-system';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { CategoryTabs, QuestRow } from './tutorial-list-rows';
import { toneOf } from './tone';
import type { ShownList, TutorialFlow } from './use-tutorial-flow';

type Shown = ShownList;

const CLOSE = 36;
const BANNER_ROUND = 24;
const DONE_ROUND = 64;
const MAX_WIDTH = 360;

// The flag, "새내기 튜토리얼" and ✕.
function Head({ onClose }: { onClose: () => void }): ReactElement {
  return (
    <View style={styles.head}>
      <Icon color={tutorialTone.dotNow} name="flag" size={20} />
      <Text accessibilityRole="header" style={styles.headWords}>
        새내기 튜토리얼
      </Text>
      <Pressable
        accessibilityLabel="닫기"
        accessibilityRole="button"
        hitSlop={(size.touchMin - CLOSE) / 2}
        onPress={onClose}
        style={styles.close}
      >
        <Icon color={color.inkMuted} name="x" size={22} />
      </Pressable>
    </View>
  );
}

// "✓ {title}" of the quest just completed (MainTutorialNext).
function Banner({ title }: { title: string }): ReactElement {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerRound}>
        <Icon color={color.onPrimary} name="check" size={16} />
      </View>
      <Text style={styles.bannerWords}>{title}</Text>
    </View>
  );
}

// "{category} k/m" in the category's colour, "✓ n / N" at the right, and a segment for each quest.
function Progress({
  tutorial,
  shown,
  tone,
}: {
  tutorial: Tutorial;
  shown: Shown;
  tone: TutorialCategoryTone;
}): ReactElement {
  const inCategory = tutorial.quests.filter(({ category }) => category === shown.category);
  const doneIn = inCategory.filter(({ status }) => status === 'completed').length;
  const done = tutorial.quests.filter(({ status }) => status === 'completed').length;
  const label = tutorial.categories.find(({ key }) => key === shown.category)?.label ?? '';
  return (
    <View style={styles.progress}>
      <View style={styles.counts}>
        <Text style={[styles.count, { color: tone.ink }]}>{`${label} ${doneIn}/${inCategory.length}`}</Text>
        <View style={styles.total}>
          <Icon color={tutorialTone.done} name="check" size={14} />
          <Text style={styles.totalWords}>{`${done} / ${tutorial.quests.length}`}</Text>
        </View>
      </View>
      <View aria-hidden style={styles.bar}>
        {tutorial.quests.map((quest) => {
          const own = toneOf(tutorial, quest.category);
          const fill =
            quest.status === 'completed' ? own.ink : quest.category === shown.category ? own.soft : tutorialTone.idle;
          return <View key={quest.key} style={[styles.segment, { backgroundColor: fill }]} />;
        })}
      </View>
    </View>
  );
}

function Page({ tutorial, shown, flow }: { tutorial: Tutorial; shown: Shown; flow: TutorialFlow }): ReactElement {
  const tone = toneOf(tutorial, shown.category);
  const banner = tutorial.quests.find(({ key }) => key === shown.banner);
  return (
    <>
      {banner === undefined ? null : <Banner title={banner.title} />}
      <Progress shown={shown} tone={tone} tutorial={tutorial} />
      <CategoryTabs flow={flow} shown={shown} tutorial={tutorial} />
      <View style={styles.rows}>
        {tutorial.quests
          .filter(({ category }) => category === shown.category)
          .map((quest) => (
            <QuestRow
              key={quest.key}
              next={quest.key === shown.next}
              onPress={() => {
                flow.openQuest(quest.key);
              }}
              quest={quest}
              tone={tone}
            />
          ))}
      </View>
      <Pressable accessibilityRole="button" disabled={flow.actions.working} onPress={flow.stop} style={styles.stop}>
        <Text style={styles.stopWords}>튜토리얼 그만하기</Text>
      </Pressable>
    </>
  );
}

// "n / n" once every quest is completed (MainTutorialDone).
function Done({ tutorial, onClose }: { tutorial: Tutorial; onClose: () => void }): ReactElement {
  const count = tutorial.quests.length;
  return (
    <View style={styles.done}>
      <View style={styles.doneRound}>
        <Icon color={tutorialTone.done} name="check" size={32} />
      </View>
      <Text accessibilityRole="header" style={styles.doneWords}>{`${count} / ${count}`}</Text>
      <View style={styles.doneButton}>
        <Button full onPress={onClose} size="lg">
          닫기
        </Button>
      </View>
    </View>
  );
}

// The tutorial's list over the main screen and a scrim, in place of the pager (MainTutorialPager): the shown
// category's quests under its tabs; a press on a quest starts it and opens its guide. Android's back button closes it.
export function TutorialList({ flow }: { flow: TutorialFlow }): ReactElement | null {
  const { list, tutorial, closeList } = flow;
  useBackToClose(list !== null, closeList);
  if (list === null || tutorial === undefined) {
    return null;
  }
  return (
    <Overlay>
      <View style={styles.scrim}>
        <View accessibilityLabel="새내기 튜토리얼" accessibilityViewIsModal style={styles.card}>
          <Head onClose={closeList} />
          {list.kind === 'done' ? (
            <Done onClose={closeList} tutorial={tutorial} />
          ) : (
            <Page flow={flow} shown={list} tutorial={tutorial} />
          )}
        </View>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space[6],
    paddingHorizontal: space[5],
    backgroundColor: color.scrim,
  },
  card: {
    alignSelf: 'stretch',
    gap: 14,
    maxWidth: MAX_WIDTH,
    paddingTop: space[5],
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  headWords: { flex: 1, fontFamily: font.bold, fontSize: 15, lineHeight: 22, color: color.ink },
  close: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CLOSE,
    height: CLOSE,
    marginRight: -6,
    borderRadius: radius.full,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: 10,
    paddingHorizontal: space[3],
    borderRadius: 14,
    backgroundColor: tutorialTone.doneSoft,
  },
  bannerRound: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BANNER_ROUND,
    height: BANNER_ROUND,
    borderRadius: radius.full,
    backgroundColor: tutorialTone.done,
  },
  bannerWords: { flex: 1, fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: tutorialTone.doneWords },
  progress: { gap: space[2] },
  counts: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  count: { fontFamily: font.bold, fontSize: 13, lineHeight: 18 },
  total: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  totalWords: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  bar: { flexDirection: 'row', gap: 3, height: space[2] },
  segment: { flex: 1, borderRadius: radius.full },
  rows: { gap: 6 },
  stop: { alignSelf: 'center', justifyContent: 'center', height: CLOSE, paddingHorizontal: space[3] },
  stopWords: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.inkFaint },
  done: { alignItems: 'center', gap: space[2], paddingTop: space[3], paddingBottom: space[1] },
  doneRound: {
    alignItems: 'center',
    justifyContent: 'center',
    width: DONE_ROUND,
    height: DONE_ROUND,
    borderRadius: radius.full,
    backgroundColor: tutorialTone.doneSoft,
  },
  doneWords: { marginTop: space[1], fontFamily: font.bold, fontSize: 22, lineHeight: 30, color: color.ink },
  doneButton: { alignSelf: 'stretch', marginTop: space[2] },
});
