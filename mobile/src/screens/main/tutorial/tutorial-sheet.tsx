/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Tutorial, TutorialQuest } from '@/api/tutorial-types';
import { BottomSheet, Button, color, font, Icon, radius, space, text, tutorialTone } from '@/design-system';
import { kickerOf } from '@/features/tutorial/rules';
import { Places } from './tutorial-places';
import { Said } from './tutorial-said';
import type { SheetView, TutorialFlow } from './use-tutorial-flow';
import type { TutorialPinTarget } from './use-tutorial-pin';

// The switch of 어시스턴트에게 예약 부탁하기: on since the library cards (P06-08), which merge after the Assistant's
// library tools (P06-07). An object, so that a test can turn it off.
export const TUTORIAL_SHEET_FLAGS = { askAssistantToBook: true };

interface TutorialSheetProps {
  flow: TutorialFlow;
  // 지도에서 보기: the sheet closes, and the main map comes to the point and drops the tutorial place pin there.
  onShowOnMap: (target: TutorialPinTarget) => void;
  // 어시스턴트에게 예약 부탁하기: the sheet closes and the chat opens with the words sent.
  onAskAssistant: (words: string) => void;
}

const DOT = 6;
const DOT_NOW = 14;

// One dot for each quest: the completed ones in the tutorial's ink, the one shown wider.
function Dots({ tutorial, shownKey }: { tutorial: Tutorial; shownKey: string }): ReactElement {
  return (
    <View aria-hidden style={styles.dots}>
      {tutorial.quests.map(({ key, status }) => (
        <View
          key={key}
          style={[styles.dot, status === 'completed' && styles.dotDone, key === shownKey && styles.dotNow]}
        />
      ))}
    </View>
  );
}

interface ButtonsProps {
  quest: TutorialQuest;
  shown: SheetView;
  flow: TutorialFlow;
  onAskAssistant: TutorialSheetProps['onAskAssistant'];
}

// 어시스턴트에게 예약 부탁하기, for a quest with `ask` (the 관정 quest's "관정도서관 7층 열람실에 한 자리 예약해줘"), while
// its switch is on.
function AskAssistant({ quest, onAskAssistant }: Pick<ButtonsProps, 'quest' | 'onAskAssistant'>): ReactElement | null {
  const { ask } = quest;
  if (!TUTORIAL_SHEET_FLAGS.askAssistantToBook || ask === undefined) {
    return null;
  }
  return (
    <Button
      full
      onPress={() => {
        onAskAssistant(ask);
      }}
      variant="secondary"
    >
      어시스턴트에게 예약 부탁하기
    </Button>
  );
}

// Two buttons side by side, each half the width.
function Pair({ left, right }: { left: ReactElement; right: ReactElement }): ReactElement {
  return (
    <View style={styles.pair}>
      <View style={styles.half}>{left}</View>
      <View style={styles.half}>{right}</View>
    </View>
  );
}

// The 관정 quest's buttons: 나중에 and 완료했어요, 어시스턴트에게 예약 부탁하기 (while its switch is on) and the skip;
// none while the check runs; after a check that found nothing or failed, 다시 확인 and 그냥 완료하기 with
// 어시스턴트에게 예약 부탁하기.
function KwanjeongButtons(props: ButtonsProps & { skipLabel: string }): ReactElement | null {
  const { quest, skipLabel, shown, flow, onAskAssistant } = props;
  const { working } = flow.actions;
  if (shown.mode === 'checking') {
    return null;
  }
  if (shown.mode === 'notFound' || shown.mode === 'failed') {
    return (
      <View style={styles.buttons}>
        <Pair
          left={
            <Button full onPress={flow.check} variant="secondary">
              다시 확인
            </Button>
          }
          right={
            <Button disabled={working} full onPress={flow.forceDone} variant="secondary">
              그냥 완료하기
            </Button>
          }
        />
        <AskAssistant onAskAssistant={onAskAssistant} quest={quest} />
      </View>
    );
  }
  return (
    <View style={styles.buttons}>
      <Pair
        left={
          <Button full onPress={flow.closeSheet} variant="secondary">
            나중에
          </Button>
        }
        right={
          <Button full onPress={flow.check}>
            완료했어요
          </Button>
        }
      />
      <AskAssistant onAskAssistant={onAskAssistant} quest={quest} />
      <Button centred disabled={working} onPress={flow.skip} variant="ghost">
        {skipLabel}
      </Button>
    </View>
  );
}

// The sheet's buttons: 나중에 and 완료했어요 for a button quest, with 어시스턴트에게 예약 부탁하기 for one with `ask` (the
// 관정 quest as the main server serves it while its check is off), the checked 관정 quest's own, and 퀘스트 완료 under
// the message.
function Buttons({ quest, shown, flow, onAskAssistant }: ButtonsProps): ReactElement | null {
  const { working } = flow.actions;
  if (shown.mode === 'message') {
    return (
      <Button disabled={working} full onPress={flow.finish} size="lg">
        퀘스트 완료
      </Button>
    );
  }
  if (quest.completion.kind === 'kwanjeongCheck') {
    return (
      <KwanjeongButtons
        flow={flow}
        onAskAssistant={onAskAssistant}
        quest={quest}
        shown={shown}
        skipLabel={quest.completion.skipLabel}
      />
    );
  }
  return (
    <View style={styles.buttons}>
      <Pair
        left={
          <Button full onPress={flow.closeSheet} variant="secondary">
            나중에
          </Button>
        }
        right={
          <Button disabled={working} full onPress={flow.saidDone}>
            완료했어요
          </Button>
        }
      />
      <AskAssistant onAskAssistant={onAskAssistant} quest={quest} />
    </View>
  );
}

// A quest's sheet (MainTutorialSheet): "새내기 튜토리얼 · {category} · n/N" with the dots, the title, the body's paragraphs, the
// 완료 조건 box, the places and the links, and its buttons; after 완료했어요 or the skip, the completionMessage in the
// Assistant's bubble with 퀘스트 완료 (MainTutorialOk, with the booking row after the 관정 check found one). While the
// 관정 check runs, the sheet stays open.
export function TutorialSheet({ flow, onShowOnMap, onAskAssistant }: TutorialSheetProps): ReactElement {
  const { sheet: shown, tutorial } = flow;
  const quest = shown === null ? undefined : tutorial?.quests.find(({ key }) => key === shown.key);
  const close = shown?.mode === 'checking' ? (): void => undefined : flow.closeSheet;
  return (
    <BottomSheet label="새내기 튜토리얼 퀘스트" onClose={close} open={shown !== null && quest !== undefined}>
      {shown === null || quest === undefined || tutorial === undefined ? null : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.head}>
            <View style={styles.kicker}>
              <Icon color={tutorialTone.ink} name="flag" size={14} />
              <Text style={styles.kickerWords}>{kickerOf(tutorial, quest)}</Text>
            </View>
            <Dots shownKey={quest.key} tutorial={tutorial} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {quest.title}
          </Text>
          {quest.body.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
          <View style={styles.condition}>
            <Icon color={tutorialTone.ink} name="check" size={16} />
            <View style={styles.conditionWords}>
              <Text style={styles.conditionLabel}>완료 조건</Text>
              <Text style={styles.conditionText}>{quest.condition}</Text>
            </View>
          </View>
          <Places onShowOnMap={onShowOnMap} quest={quest} />
          <Said quest={quest} shown={shown} />
          <Buttons flow={flow} onAskAssistant={onAskAssistant} quest={quest} shown={shown} />
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingHorizontal: space[5], paddingBottom: space[2] },
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kickerWords: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: tutorialTone.ink },
  dots: { flexDirection: 'row', gap: space[1] },
  dot: { width: DOT, height: DOT, borderRadius: radius.full, backgroundColor: color.border },
  dotDone: { backgroundColor: tutorialTone.ink },
  dotNow: { width: DOT_NOW, backgroundColor: tutorialTone.dotNow },
  title: { ...text.titleLg, marginTop: -space[1], color: color.ink },
  paragraph: { ...text.body, lineHeight: 24, color: color.inkMuted },
  condition: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: space[3],
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: tutorialTone.box,
  },
  conditionWords: { flex: 1, gap: 2 },
  conditionLabel: { fontFamily: font.bold, fontSize: 12, lineHeight: 16, color: tutorialTone.ink },
  conditionText: { ...text.label, color: color.ink },
  buttons: { gap: space[2] },
  pair: { flexDirection: 'row', gap: space[2] },
  half: { flex: 1 },
});
