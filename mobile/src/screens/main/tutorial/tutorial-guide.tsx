/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LatLng } from '@/api/types';
import { color, font, Icon, iconOrFlag, type IconName, radius, shadow, size, space } from '@/design-system';
import { kindOf, stepAt } from '@/features/tutorial/guide';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { GuideBubble } from './guide-bubble';
import { GuidePanel, type GuideShown } from './guide-panel';
import { useGuidePositions } from './guide-places';
import { toneOf } from './tone';
import type { TutorialFlow } from './use-tutorial-flow';
import { WebLinks } from './web-links';

// A quest's guide on the map, in place of its sheet (the canvas's `MainTutorialCard1`–`6`, `MainTutorialMeal` and
// `MainTut*` boards): the bar at the top, the bubble under it, and the panel of steps at the bottom. The map behind
// draws the guide's places (`use-guide-map.ts`).

const BAR_BUTTON = 40;
const TILE = 34;
const BAR = 52;

export interface GuideActions {
  // 길찾기: the walking route to the place.
  onRoute: (place: { title: string; position: LatLng }) => void;
  // 어시스턴트에게 부탁: the guide closes and the chat opens with the words sent.
  onAsk: (words: string) => void;
}

type Shown = GuideShown;

function BarButton({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={(size.touchMin - BAR_BUTTON) / 2}
      onPress={onPress}
      style={styles.barButton}
    >
      <Icon color={icon === 'x' ? color.inkMuted : color.ink} name={icon} size={icon === 'x' ? 20 : 22} />
    </Pressable>
  );
}

// ← to the list, the quest's icon and title, the chosen kind's chip, 🌐 and ✕.
function Bar({ flow, quest, guide, view, tone }: Shown): ReactElement {
  const kind = kindOf(guide, view.kind);
  return (
    <View style={styles.bar}>
      <BarButton icon="chevronLeft" label="튜토리얼 목록으로" onPress={flow.backToList} />
      <View style={[styles.tile, { backgroundColor: tone.soft }]}>
        <Icon color={tone.ink} name={iconOrFlag(quest.icon)} size={20} />
      </View>
      <Text numberOfLines={1} style={styles.barTitle}>
        {quest.title}
      </Text>
      {kind === null ? null : (
        <Pressable
          accessibilityLabel={`${kind.label} · 종류 다시 고르기`}
          accessibilityRole="button"
          onPress={() => {
            flow.chooseKind(null);
          }}
          style={[styles.kindChip, { backgroundColor: tone.soft }]}
        >
          <Icon color={tone.ink} name={iconOrFlag(kind.icon)} size={14} />
          <Text style={[styles.kindWords, { color: tone.ink }]}>{kind.label}</Text>
        </Pressable>
      )}
      <WebLinks links={quest.links} />
      <BarButton icon="x" label="닫기" onPress={flow.closeGuide} />
    </View>
  );
}

export function TutorialGuideOverlay({
  flow,
  onRoute,
  onAsk,
}: { flow: TutorialFlow } & GuideActions): ReactElement | null {
  const { guide: view, tutorial } = flow;
  const quest = view === null ? undefined : tutorial?.quests.find(({ key }) => key === view.key);
  const guide = quest?.guide;
  const positions = useGuidePositions(view !== null);
  useBackToClose(guide !== undefined, flow.closeGuide);
  if (view === null || quest === undefined || guide === undefined || tutorial === undefined) {
    return null;
  }
  const shown: Shown = { flow, quest, guide, view, tone: toneOf(tutorial, quest.category) };
  const step = stepAt(guide, view)?.step;
  const spot = step?.spots?.[view.spot];
  const place = spot === undefined ? step?.place : spot.place;
  return (
    <View style={styles.overlay}>
      <Bar {...shown} />
      <GuideBubble
        guide={guide}
        onAsk={(words) => {
          flow.closeGuide();
          onAsk(words);
        }}
        onKind={flow.chooseKind}
        onRoute={() => {
          const position = place === undefined ? null : positions(place);
          if (position !== null) {
            onRoute({ title: spot?.name ?? step?.name ?? quest.title, position });
          }
        }}
        onSpot={flow.pickSpot}
        position={view}
        tone={shown.tone}
      />
      <View style={styles.fill} />
      <GuidePanel {...shown} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    gap: 10,
    paddingTop: space[2],
    paddingHorizontal: space[3],
    paddingBottom: space[4],
    pointerEvents: 'box-none',
  },
  fill: { flex: 1, pointerEvents: 'none' },
  bar: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: BAR,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: color.surface,
    boxShadow: shadow.mapCard,
  },
  barButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BAR_BUTTON,
    height: BAR_BUTTON,
    borderRadius: radius.md,
  },
  tile: { alignItems: 'center', justifyContent: 'center', width: TILE, height: TILE, borderRadius: 10 },
  barTitle: { flex: 1, fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: color.ink },
  kindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: 30,
    paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  kindWords: { fontFamily: font.bold, fontSize: 12, lineHeight: 16 },
});
