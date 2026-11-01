/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { openBrowserAsync } from 'expo-web-browser';
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { placesQuery } from '@/api/queries';
import type { Tutorial, TutorialPlace, TutorialQuest } from '@/api/tutorial-types';
import type { LatLng, Place } from '@/api/types';
import { BottomSheet, Button, color, font, Icon, radius, space, text, tutorialTone } from '@/design-system';
import { stepOf } from '@/features/tutorial/rules';
import type { SheetView, TutorialFlow } from './use-tutorial-flow';

// What 어시스턴트에게 예약 부탁하기 sends, the frames' words.
export const KWANJEONG_ASK = '관정도서관 7층 열람실에 한 자리 예약해줘';

interface TutorialSheetProps {
  flow: TutorialFlow;
  // 지도에서 보기: the sheet closes and the main map comes to the point.
  onShowOnMap: (position: LatLng) => void;
  // 어시스턴트에게 예약 부탁하기: the sheet closes and the chat opens with the words sent.
  onAskAssistant: (words: string) => void;
}

const DOT = 6;
const DOT_NOW = 14;
const BOT = 32;

// A place's words and point: a Place of the list by its number, with its floor, or a point with its words. A Place
// the list does not hold has no point, and no 지도에서 보기.
function shownPlace(entry: TutorialPlace, places: readonly Place[]): { words: string; position: LatLng | null } {
  if ('point' in entry) {
    return { words: entry.label, position: entry.point };
  }
  const place = places.find(({ number }) => number === entry.place);
  const name =
    entry.label ?? `${place?.name ?? `${entry.place}동`}${entry.floor === undefined ? '' : ` ${entry.floor}층`}`;
  return { words: name, position: place ?? null };
}

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

function Places({
  quest,
  onShowOnMap,
}: {
  quest: TutorialQuest;
  onShowOnMap: TutorialSheetProps['onShowOnMap'];
}): ReactElement {
  const places = useQuery(placesQuery).data ?? [];
  return (
    <>
      {quest.places.map((entry) => {
        const { words, position } = shownPlace(entry, places);
        return (
          <View key={words} style={styles.place}>
            <Icon color={tutorialTone.ink} name="pin" size={16} />
            <Text style={styles.placeWords}>{words}</Text>
            {position === null ? null : (
              <Button
                label={`${words} 지도에서 보기`}
                onPress={() => {
                  onShowOnMap({ latitude: position.latitude, longitude: position.longitude });
                }}
                variant="secondary"
              >
                지도에서 보기
              </Button>
            )}
          </View>
        );
      })}
      {quest.links.map(({ label, url }) => (
        <Button
          icon="route"
          key={url}
          label={`${label} 열기`}
          onPress={() => {
            void openBrowserAsync(url).catch(() => null);
          }}
          variant="ghost"
        >
          {label}
        </Button>
      ))}
    </>
  );
}

// The Assistant's bubble under the content: the quest's completionMessage.
function Said({ words }: { words: string }): ReactElement {
  return (
    <View style={styles.said}>
      <View style={styles.bot}>
        <Icon color={color.onPrimary} name="chat" size={16} />
      </View>
      <View style={styles.bubble}>
        <Text style={styles.bubbleWords}>{words}</Text>
      </View>
    </View>
  );
}

interface ButtonsProps {
  quest: TutorialQuest;
  shown: SheetView;
  flow: TutorialFlow;
  onAskAssistant: TutorialSheetProps['onAskAssistant'];
}

// The sheet's buttons: 나중에 and 완료했어요 for a button quest; for the 관정 quest 나중에, 어시스턴트에게 예약 부탁하기
// and its skip, until its check (ticket P06-05) adds 완료했어요; 퀘스트 완료 under the message.
function Buttons({ quest, shown, flow, onAskAssistant }: ButtonsProps): ReactElement {
  const { working } = flow.actions;
  if (shown.mode === 'message') {
    return (
      <Button disabled={working} full onPress={flow.finish} size="lg">
        퀘스트 완료
      </Button>
    );
  }
  const later = (
    <View style={styles.half}>
      <Button full onPress={flow.closeSheet} variant="secondary">
        나중에
      </Button>
    </View>
  );
  if (quest.completion.kind === 'button') {
    return (
      <View style={styles.pair}>
        {later}
        <View style={styles.half}>
          <Button disabled={working} full onPress={flow.saidDone}>
            완료했어요
          </Button>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.buttons}>
      <View style={styles.pair}>{later}</View>
      <Button
        full
        onPress={() => {
          onAskAssistant(KWANJEONG_ASK);
        }}
        variant="secondary"
      >
        어시스턴트에게 예약 부탁하기
      </Button>
      <Button centred disabled={working} onPress={flow.skip} variant="ghost">
        {quest.completion.skipLabel}
      </Button>
    </View>
  );
}

// A quest's sheet (MainTutorialSheet): "새내기 튜토리얼 · n/N" with the dots, the title, the body's paragraphs, the
// 완료 조건 box, the places and the links, and its buttons; after 완료했어요 or the skip, the completionMessage in the
// Assistant's bubble with 퀘스트 완료 (MainTutorialOk without the booking row).
export function TutorialSheet({ flow, onShowOnMap, onAskAssistant }: TutorialSheetProps): ReactElement {
  const { sheet: shown, tutorial } = flow;
  const quest = shown === null ? undefined : tutorial?.quests.find(({ key }) => key === shown.key);
  return (
    <BottomSheet label="새내기 튜토리얼 퀘스트" onClose={flow.closeSheet} open={shown !== null && quest !== undefined}>
      {shown === null || quest === undefined || tutorial === undefined ? null : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.head}>
            <View style={styles.kicker}>
              <Icon color={tutorialTone.ink} name="flag" size={14} />
              <Text style={styles.kickerWords}>{`새내기 튜토리얼 · ${stepOf(tutorial, quest.key)}`}</Text>
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
          {shown.mode === 'message' ? <Said words={quest.completionMessage} /> : null}
          <Buttons flow={flow} onAskAssistant={onAskAssistant} quest={quest} shown={shown} />
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingHorizontal: space[5], paddingBottom: space[2] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  place: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  placeWords: { ...text.label, flex: 1, color: color.ink },
  said: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BOT,
    height: BOT,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  bubble: {
    flex: 1,
    paddingVertical: space[3],
    paddingHorizontal: 14,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    backgroundColor: color.blue50,
  },
  bubbleWords: { ...text.body, color: color.ink },
  buttons: { gap: space[2] },
  pair: { flexDirection: 'row', gap: space[2] },
  half: { flex: 1 },
});
