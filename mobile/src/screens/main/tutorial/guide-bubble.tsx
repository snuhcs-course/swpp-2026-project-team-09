/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TutorialAction, TutorialGuide, TutorialKind, TutorialStep } from '@/api/tutorial-types';
import {
  color,
  font,
  Icon,
  iconOrFlag,
  radius,
  shadow,
  space,
  type TutorialCategoryTone,
  tutorialTone,
} from '@/design-system';
import { type GuidePosition, isChoosing, stepAt } from '@/features/tutorial/guide';
import { About, Actions, Chips, LinkButton, Rows, Spots } from './guide-parts';

const NUMBER = 28;
const KIND_TILE = 44;

export interface BubbleProps {
  guide: TutorialGuide;
  position: GuidePosition;
  tone: TutorialCategoryTone;
  onKind: (kind: string) => void;
  onSpot: (spot: number) => void;
  // 길찾기 of the step, or of the spot shown.
  onRoute: () => void;
  onAsk: (words: string) => void;
}

// A kind to choose: its icon, its title and the places on its way.
function KindOption({
  kind,
  tone,
  onPress,
}: {
  kind: TutorialKind;
  tone: TutorialCategoryTone;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable accessibilityLabel={kind.title} accessibilityRole="button" onPress={onPress} style={styles.kind}>
      <View style={[styles.kindTile, { backgroundColor: tone.soft }]}>
        <Icon color={tone.ink} name={iconOrFlag(kind.icon)} size={22} />
      </View>
      <View style={styles.kindWords}>
        <Text style={styles.kindTitle}>{kind.title}</Text>
        <View style={styles.route}>
          {kind.route.map((stop, at) => (
            <View key={stop} style={styles.routeStop}>
              {at === 0 ? null : <Text style={styles.routeArrow}>→</Text>}
              <Text style={styles.routeWords}>{stop}</Text>
            </View>
          ))}
        </View>
      </View>
      <Icon color={tutorialTone.faint} name="chevronRight" size={20} />
    </Pressable>
  );
}

// The step's number and title, with 선택 for a step the User may leave out.
function StepHead({
  step,
  number,
  tone,
}: {
  step: TutorialStep;
  number: string | null;
  tone: TutorialCategoryTone;
}): ReactElement {
  return (
    <View style={styles.head}>
      {number === null ? null : <Text style={[styles.number, { backgroundColor: tone.ink }]}>{number}</Text>}
      <Text style={styles.title}>{step.title}</Text>
      {step.optional === true ? <Text style={styles.optional}>선택</Text> : null}
    </View>
  );
}

// What a step shows of its place, its facts and its buttons: those of the spot shown for a step with several.
function placeOfStep(
  guide: TutorialGuide,
  step: TutorialStep,
  spot: number,
): {
  name: string | null;
  sub: string | null;
  chips: TutorialStep['chips'];
  actions: readonly TutorialAction[];
} {
  const shown = step.spots?.[Math.max(0, Math.min(step.spots.length - 1, spot))];
  if (shown !== undefined) {
    const route: TutorialAction[] = shown.place === undefined ? [] : [{ kind: 'route', words: '길찾기' }];
    return { name: shown.name, sub: shown.sub ?? null, chips: shown.chips, actions: route };
  }
  const named = step.name !== undefined && (guide.together !== true || step.showName === true);
  return {
    name: named ? (step.name ?? null) : null,
    sub: named ? (step.sub ?? null) : null,
    chips: step.chips,
    actions: step.actions ?? [],
  };
}

function StepBody(props: BubbleProps & { step: TutorialStep; index: number }): ReactElement {
  const { guide, position, tone, onSpot, onRoute, onAsk, step, index } = props;
  const { name, sub, chips, actions } = placeOfStep(guide, step, position.spot);
  return (
    <>
      <StepHead number={guide.together === true ? null : String(index + 1)} step={step} tone={tone} />
      {name === null ? null : (
        <View>
          <Text style={styles.place}>{name}</Text>
          {sub === null ? null : <Text style={styles.sub}>{sub}</Text>}
        </View>
      )}
      {step.link === undefined ? null : <LinkButton url={step.link.url} words={step.link.words} />}
      {step.spots === undefined ? null : <Spots onPick={onSpot} shown={position.spot} spots={step.spots} tone={tone} />}
      {step.rows === undefined ? null : <Rows rows={step.rows} tone={tone} />}
      {chips === undefined || chips.length === 0 ? null : <Chips chips={chips} />}
      {actions.length === 0 ? null : <Actions actions={actions} onAsk={onAsk} onRoute={onRoute} tone={tone} />}
    </>
  );
}

// The bubble under the guide's bar: the guide's or the step's paragraphs, then the kinds to choose from, or the step
// shown with its place, its link, its spots, its rows, its chips and its buttons.
export function GuideBubble(props: BubbleProps): ReactElement | null {
  const { guide, position, tone, onKind } = props;
  const choosing = isChoosing(guide, position.kind);
  const shown = stepAt(guide, position);
  const about = shown?.step.about ?? guide.about;
  return (
    <View style={[styles.bubble, { borderTopColor: tone.ink }]}>
      {about === undefined || choosing ? null : <About paragraphs={about} />}
      {choosing
        ? (guide.kinds ?? []).map((kind) => (
            <KindOption
              key={kind.key}
              kind={kind}
              onPress={() => {
                onKind(kind.key);
              }}
              tone={tone}
            />
          ))
        : null}
      {!choosing && shown !== null ? <StepBody {...props} index={shown.index} step={shown.step} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    gap: 10,
    padding: 14,
    borderTopWidth: 4,
    borderRadius: 20,
    backgroundColor: color.surface,
    boxShadow: shadow.mapCard,
  },
  kind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  kindTile: {
    alignItems: 'center',
    justifyContent: 'center',
    width: KIND_TILE,
    height: KIND_TILE,
    borderRadius: 14,
  },
  kindWords: { flex: 1, gap: space[1] },
  kindTitle: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: color.ink },
  route: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[1] },
  routeStop: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  routeArrow: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: tutorialTone.faint },
  routeWords: {
    overflow: 'hidden',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSubtle,
    fontFamily: font.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: color.inkMuted,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  number: {
    overflow: 'hidden',
    width: NUMBER,
    height: NUMBER,
    borderRadius: radius.full,
    fontFamily: font.bold,
    fontSize: 14,
    lineHeight: NUMBER,
    textAlign: 'center',
    color: color.onPrimary,
  },
  title: { flex: 1, fontFamily: font.bold, fontSize: 17, lineHeight: 24, color: color.ink },
  optional: {
    overflow: 'hidden',
    paddingVertical: 2,
    paddingHorizontal: space[2],
    borderRadius: radius.full,
    backgroundColor: color.surfaceSubtle,
    fontFamily: font.bold,
    fontSize: 11,
    lineHeight: 16,
    color: color.inkMuted,
  },
  place: { fontFamily: font.bold, fontSize: 15, lineHeight: 22, color: color.ink },
  sub: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkFaint },
});
