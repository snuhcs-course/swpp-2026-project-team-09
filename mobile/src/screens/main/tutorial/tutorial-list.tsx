/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Tutorial } from '@/api/tutorial-types';
import { Button, color, font, Icon, radius, size, space, tutorialTone } from '@/design-system';
import { CategoryTabs, QuestRow } from './tutorial-list-rows';
import { TutorialPanel } from './tutorial-panel';
import type { ShownList, TutorialFlow } from './use-tutorial-flow';

type Shown = ShownList;

const CLOSE = 40;
const BANNER_ROUND = 24;
const DONE_ROUND = 72;

// "새내기 튜토리얼" and ✕.
function Head({ onClose }: { onClose: () => void }): ReactElement {
  return (
    <View style={styles.head}>
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

// A segment for each quest: a completed one in navy, one of the shown category darker than the rest.
function Segments({ tutorial, category }: { tutorial: Tutorial; category: string | null }): ReactElement {
  return (
    <View aria-hidden style={styles.bar}>
      {tutorial.quests.map((quest) => {
        const fill =
          quest.status === 'completed'
            ? tutorialTone.done
            : quest.category === category
              ? tutorialTone.rowsLine
              : color.border;
        return <View key={quest.key} style={[styles.segment, { backgroundColor: fill }]} />;
      })}
    </View>
  );
}

// "{category} k/m", "✓ n / N" at the right, and the segments.
function Progress({ tutorial, shown }: { tutorial: Tutorial; shown: Shown }): ReactElement {
  const inCategory = tutorial.quests.filter(({ category }) => category === shown.category);
  const doneIn = inCategory.filter(({ status }) => status === 'completed').length;
  const done = tutorial.quests.filter(({ status }) => status === 'completed').length;
  const label = tutorial.categories.find(({ key }) => key === shown.category)?.label ?? '';
  return (
    <View style={styles.progress}>
      <View style={styles.counts}>
        <Text style={styles.count}>{`${label} ${doneIn}/${inCategory.length}`}</Text>
        <View style={styles.total}>
          <Icon color={tutorialTone.done} name="check" size={14} />
          <Text style={styles.totalWords}>{`${done} / ${tutorial.quests.length}`}</Text>
        </View>
      </View>
      <Segments category={shown.category} tutorial={tutorial} />
    </View>
  );
}

function Page({ tutorial, shown, flow }: { tutorial: Tutorial; shown: Shown; flow: TutorialFlow }): ReactElement {
  const banner = tutorial.quests.find(({ key }) => key === shown.banner);
  return (
    <>
      <View style={styles.top}>
        {banner === undefined ? null : <Banner title={banner.title} />}
        <Progress shown={shown} tutorial={tutorial} />
        <CategoryTabs flow={flow} shown={shown} tutorial={tutorial} />
      </View>
      <ScrollView contentContainerStyle={styles.rows} style={styles.scroll} testID="tutorial-list-scroll">
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
            />
          ))}
      </ScrollView>
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
      <Text style={styles.doneLine}>새내기 튜토리얼의 퀘스트를 모두 마쳤어요</Text>
      <View style={styles.doneBar}>
        <Segments category={null} tutorial={tutorial} />
      </View>
      <View style={styles.doneButton}>
        <Button full onPress={onClose} size="lg">
          닫기
        </Button>
      </View>
    </View>
  );
}

// The tutorial's list, a glass panel over the map above the navigation (P06 ticket 55), in place of the pager
// (MainTutorialPager): the shown category's quests under its tabs; a press on a quest starts it and opens its guide.
// Android's back button closes it.
export function TutorialList({ flow }: { flow: TutorialFlow }): ReactElement | null {
  const { list, tutorial, closeList } = flow;
  return (
    <TutorialPanel label="새내기 튜토리얼" onClose={closeList} open={list !== null && tutorial !== undefined}>
      {list === null || tutorial === undefined ? null : (
        <>
          <Head onClose={closeList} />
          {list.kind === 'done' ? (
            <Done onClose={closeList} tutorial={tutorial} />
          ) : (
            <Page flow={flow} shown={list} tutorial={tutorial} />
          )}
        </>
      )}
    </TutorialPanel>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingTop: 10,
    paddingRight: space[2],
    paddingLeft: space[4],
  },
  // A sheet's title, as the design system's bottom sheets have it.
  headWords: { flex: 1, fontFamily: font.bold, fontSize: 21, lineHeight: 29, letterSpacing: -0.3, color: color.ink },
  close: { alignItems: 'center', justifyContent: 'center', width: CLOSE, height: CLOSE, borderRadius: radius.md },
  top: { gap: space[3], paddingTop: space[1], paddingHorizontal: space[4] },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: space[3],
    borderRadius: radius.lg,
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
  counts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between' },
  count: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  total: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  totalWords: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: tutorialTone.done },
  bar: { flexDirection: 'row', gap: 3, height: 6 },
  segment: { flex: 1, borderRadius: radius.full },
  rows: { gap: space[2], paddingHorizontal: space[4] },
  scroll: { flexShrink: 1 },
  stop: {
    alignSelf: 'center',
    justifyContent: 'center',
    minHeight: CLOSE,
    marginVertical: space[1],
    paddingHorizontal: space[3],
  },
  stopWords: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  done: { alignItems: 'center', paddingTop: space[2], paddingHorizontal: space[5], paddingBottom: space[5] },
  doneRound: {
    alignItems: 'center',
    justifyContent: 'center',
    width: DONE_ROUND,
    height: DONE_ROUND,
    borderRadius: radius.full,
    backgroundColor: tutorialTone.doneSoft,
  },
  doneWords: { marginTop: 14, fontFamily: font.bold, fontSize: 22, lineHeight: 30, color: color.ink },
  doneLine: {
    marginTop: space[1],
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: color.inkMuted,
    textAlign: 'center',
  },
  doneBar: { alignSelf: 'stretch', marginTop: 18 },
  doneButton: { alignSelf: 'stretch', marginTop: 22 },
});
