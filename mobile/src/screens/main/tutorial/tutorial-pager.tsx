/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Tutorial, TutorialQuest } from '@/api/tutorial-types';
import {
  Badge,
  Button,
  Chip,
  color,
  font,
  Icon,
  Overlay,
  radius,
  shadow,
  space,
  text,
  tutorialTone,
} from '@/design-system';
import { categoryOf } from '@/features/tutorial/rules';
import { useBackToClose } from '@/hooks/use-back-to-close';
import type { PagerView, TutorialFlow } from './use-tutorial-flow';

interface ArrowProps {
  direction: -1 | 1;
  disabled: boolean;
  onPress: () => void;
}

const ARROW = 40;
const ROUND = 52;
const MAX_WIDTH = 360;

// ◀ or ▶, which the ends of the tutorial turn off.
function Arrow({ direction, disabled, onPress }: ArrowProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={direction === -1 ? '이전 퀘스트' : '다음 퀘스트'}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={(48 - ARROW) / 2}
      onPress={onPress}
      style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
    >
      <Text style={[styles.arrowMark, disabled && styles.arrowOff]}>{direction === -1 ? '◀' : '▶'}</Text>
    </Pressable>
  );
}

function kickerOf(pager: Exclude<PagerView, { kind: 'done' }>, count: number): string {
  const step = `${pager.index + 1}/${count}`;
  return pager.kind === 'next' ? `퀘스트 완료! 다음 퀘스트 · ${step}` : `새내기 튜토리얼 ${step}`;
}

// 퀘스트 시작, or 내용 보기 for a quest started; 튜토리얼 그만하기 and 닫기.
function PageActions({ flow, quest }: { flow: TutorialFlow; quest: TutorialQuest }): ReactElement {
  const started = quest.status !== 'notStarted';
  return (
    <View style={styles.actions}>
      <Button
        disabled={flow.actions.working}
        full
        onPress={() => {
          if (started) {
            flow.openSheet(quest.key);
          } else {
            flow.startQuest(quest.key);
          }
        }}
        size="lg"
      >
        {started ? '내용 보기' : '퀘스트 시작'}
      </Button>
      <View style={styles.row}>
        <Button disabled={flow.actions.working} onPress={flow.stop} variant="ghost">
          튜토리얼 그만하기
        </Button>
        <Button onPress={flow.closePager} variant="secondary">
          닫기
        </Button>
      </View>
    </View>
  );
}

// The row of the Tutorial Categories' chips, the shown quest's selected; a press moves to that category's first quest
// not started, or its first quest.
function CategoryChips({
  tutorial,
  quest,
  flow,
}: {
  tutorial: Tutorial;
  quest: TutorialQuest;
  flow: TutorialFlow;
}): ReactElement | null {
  if (tutorial.categories.length === 0) {
    return null;
  }
  return (
    <ScrollView
      accessibilityLabel="퀘스트 카테고리"
      contentContainerStyle={styles.chips}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroll}
    >
      {tutorial.categories.map(({ key, label }) => (
        <Chip
          key={key}
          onPress={() => {
            flow.showCategory(key);
          }}
          selected={key === quest.category}
          size="sm"
        >
          {label}
        </Chip>
      ))}
    </ScrollView>
  );
}

interface PageProps {
  tutorial: Tutorial;
  pager: Exclude<PagerView, { kind: 'done' }>;
  flow: TutorialFlow;
}

// One quest's page: the categories' chips, its category's label over its title and brief between ◀ and ▶, its status, and 퀘스트 시작 or, once it is started, 내용 보기.
function Page({ tutorial, pager, flow }: PageProps): ReactElement | null {
  const quest = tutorial.quests[pager.index];
  if (quest === undefined) {
    return null;
  }
  const last = tutorial.quests.length - 1;
  const category = categoryOf(tutorial, quest);
  return (
    <>
      <Text style={styles.kicker}>{kickerOf(pager, tutorial.quests.length)}</Text>
      <CategoryChips flow={flow} quest={quest} tutorial={tutorial} />
      <View style={styles.paging}>
        <Arrow
          direction={-1}
          disabled={pager.index === 0}
          onPress={() => {
            flow.movePager(-1);
          }}
        />
        <View style={styles.words}>
          {category === null ? null : <Text style={styles.category}>{category}</Text>}
          <Text accessibilityRole="header" style={styles.title}>
            {quest.title}
          </Text>
          <Text style={styles.brief}>{quest.brief}</Text>
        </View>
        <Arrow
          direction={1}
          disabled={pager.index === last}
          onPress={() => {
            flow.movePager(1);
          }}
        />
      </View>
      {quest.status === 'started' ? <Badge tone="quest">진행 중</Badge> : null}
      {quest.status === 'completed' ? (
        <Badge icon="check" tone="friend">
          완료
        </Badge>
      ) : null}
      <PageActions flow={flow} quest={quest} />
    </>
  );
}

// "새내기 튜토리얼 완료": every quest is completed.
function Done({ onClose }: { onClose: () => void }): ReactElement {
  return (
    <>
      <Text style={styles.kicker}>새내기 튜토리얼 완료</Text>
      <Text accessibilityRole="header" style={styles.title}>
        튜토리얼을 모두 마쳤어요
      </Text>
      <Text style={styles.brief}>이제 SNU Now를 자유롭게 써 보세요.</Text>
      <View style={styles.actions}>
        <Button full onPress={onClose} size="lg">
          닫기
        </Button>
      </View>
    </>
  );
}

// The pager over the main screen and a scrim, which replaces the frames' "첫 퀘스트" popup (P06 spec "The pager"):
// the round with the flag, or the check once all is done, over the page. Android's back button closes it.
export function TutorialPager({ flow }: { flow: TutorialFlow }): ReactElement | null {
  const { pager, tutorial, closePager } = flow;
  useBackToClose(pager !== null, closePager);
  if (pager === null || tutorial === undefined) {
    return null;
  }
  const done = pager.kind === 'done';
  return (
    <Overlay>
      <View style={styles.scrim}>
        <View
          accessibilityLabel={done ? '튜토리얼 완료' : '새내기 튜토리얼'}
          accessibilityViewIsModal
          style={styles.card}
        >
          <View style={styles.round}>
            <Icon color={tutorialTone.ink} name={done ? 'check' : 'flag'} size={22} />
          </View>
          {done ? <Done onClose={closePager} /> : <Page flow={flow} pager={pager} tutorial={tutorial} />}
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
    padding: space[6],
    backgroundColor: color.scrim,
  },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 10,
    maxWidth: MAX_WIDTH,
    paddingTop: space[6],
    paddingHorizontal: space[5],
    paddingBottom: space[5],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROUND,
    height: ROUND,
    borderRadius: radius.full,
    backgroundColor: tutorialTone.pagerRound,
  },
  kicker: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: tutorialTone.ink },
  chipScroll: { alignSelf: 'stretch', flexGrow: 0 },
  chips: { flexGrow: 1, justifyContent: 'center', gap: space[1] },
  category: { fontFamily: font.bold, fontSize: 12, lineHeight: 16, color: tutorialTone.words },
  paging: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: space[1] },
  words: { flex: 1, alignItems: 'center', gap: space[1] },
  title: { ...text.title, fontFamily: font.bold, fontSize: 20, lineHeight: 28, textAlign: 'center', color: color.ink },
  brief: { ...text.label, fontFamily: font.regular, lineHeight: 21, textAlign: 'center', color: color.inkMuted },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ARROW,
    height: ARROW,
    borderRadius: radius.full,
  },
  arrowPressed: { backgroundColor: color.surfaceSunken },
  arrowMark: { fontSize: 16, lineHeight: 20, color: color.snuBlue },
  arrowOff: { color: color.border },
  actions: { alignSelf: 'stretch', gap: space[1], marginTop: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
