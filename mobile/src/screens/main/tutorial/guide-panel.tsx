/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TutorialGuide, TutorialQuest } from '@/api/tutorial-types';
import { color, font, Icon, radius, shadow, space, type TutorialCategoryTone, tutorialTone } from '@/design-system';
import { hasPrevious, mainButtonOf, stepAt, stepsOf } from '@/features/tutorial/guide';
import type { GuideView } from './use-guide-flow';
import type { TutorialFlow } from './use-tutorial-flow';

// The panel at the bottom of a quest's guide (the canvas's `MainTut*` boards): the steps' tabs, ← and the main button.

const TAB = 40;
const MAIN = 52;
const NUMBER = 20;

// The guide on screen, with the quest it is of and its category's colours.
export interface GuideShown {
  flow: TutorialFlow;
  quest: TutorialQuest;
  guide: TutorialGuide;
  view: GuideView;
  tone: TutorialCategoryTone;
}

// The steps' tabs: the shown one filled, a passed one with ✓; no numbers in a guide of places side by side.
function Tabs({ flow, guide, view, tone }: GuideShown): ReactElement {
  const together = guide.together === true;
  const now = stepAt(guide, view)?.index ?? 0;
  return (
    <View accessibilityLabel="단계" accessibilityRole="tablist" style={styles.tabs}>
      {stepsOf(guide, view.kind).map((step, at) => {
        const on = at === now;
        const past = !together && at < now;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            key={`${step.tab}-${String(at)}`}
            onPress={() => {
              flow.goToStep(at);
            }}
            style={[styles.tab, on ? { backgroundColor: tone.ink } : styles.tabOff]}
          >
            {together ? null : (
              <Text
                style={[
                  styles.tabNumber,
                  on
                    ? { backgroundColor: color.surface, color: tone.ink }
                    : past
                      ? styles.numberPast
                      : styles.numberOff,
                ]}
              >
                {past ? '✓' : String(at + 1)}
              </Text>
            )}
            <Text
              numberOfLines={1}
              style={[styles.tabWords, { color: on ? color.onPrimary : past ? color.ink : color.inkFaint }]}
            >
              {step.tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const MAIN_LOOK = {
  choose: { label: '종류를 골라 주세요', icon: null, ground: tutorialTone.idle, ink: color.inkFaint },
  next: { label: '다음', icon: 'arrowRight', ground: color.snuBlue, ink: color.onPrimary },
  done: { label: '완료', icon: 'check', ground: tutorialTone.done, ink: color.onPrimary },
} as const;

// The steps' tabs, ← and the main button: 다음 →, ✓ 완료, or "종류를 골라 주세요" while choosing.
export function GuidePanel(shown: GuideShown): ReactElement {
  const { flow, guide, view } = shown;
  const main = mainButtonOf(guide, view);
  const look = MAIN_LOOK[main];
  const steps = stepsOf(guide, view.kind).length;
  const tabs = main !== 'choose' && steps > 1;
  const inRow = guide.together === true && steps <= 3;
  const now = stepAt(guide, view)?.index ?? 0;
  return (
    <View style={[styles.panel, inRow && styles.panelRow]}>
      {tabs ? <Tabs {...shown} /> : null}
      <View style={[styles.mainRow, inRow && (tabs ? styles.mainBeside : styles.mainAlone)]}>
        {hasPrevious(guide, view) ? (
          <Pressable
            accessibilityLabel="이전"
            accessibilityRole="button"
            onPress={() => {
              if (now > 0) {
                flow.goToStep(now - 1);
              } else {
                flow.chooseKind(null);
              }
            }}
            style={styles.previous}
          >
            <Icon name="chevronLeft" size={22} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: main === 'choose', busy: flow.actions.working }}
          disabled={main === 'choose' || flow.actions.working}
          onPress={
            main === 'next'
              ? () => {
                  flow.goToStep(now + 1);
                }
              : flow.completeGuide
          }
          style={[styles.main, { backgroundColor: look.ground }]}
        >
          {look.icon === null ? null : <Icon color={look.ink} name={look.icon} size={20} />}
          <Text style={[styles.mainWords, { color: look.ink }]}>{look.label}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// The guide of the quest `flow.guide` names, over the map. Android's back button closes it.

const styles = StyleSheet.create({
  panel: {
    gap: 10,
    padding: space[3],
    borderRadius: 20,
    backgroundColor: color.surface,
    boxShadow: shadow.mapCard,
  },
  panelRow: { flexDirection: 'row' },
  tabs: { flex: 1, flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: TAB,
    paddingHorizontal: space[1],
    borderRadius: radius.md,
  },
  tabOff: { borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  tabNumber: {
    overflow: 'hidden',
    width: NUMBER,
    height: NUMBER,
    borderRadius: radius.full,
    fontFamily: font.bold,
    fontSize: 11,
    lineHeight: NUMBER,
    textAlign: 'center',
  },
  numberPast: { backgroundColor: tutorialTone.done, color: color.onPrimary },
  numberOff: { backgroundColor: color.border, color: color.inkMuted },
  tabWords: { flexShrink: 1, fontFamily: font.bold, fontSize: 13, lineHeight: 18 },
  mainRow: { flexDirection: 'row', gap: space[2] },
  mainBeside: { flexBasis: 120, flexGrow: 0 },
  mainAlone: { flex: 1 },
  previous: {
    alignItems: 'center',
    justifyContent: 'center',
    width: MAIN,
    height: MAIN,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 14,
    backgroundColor: color.surface,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    height: MAIN,
    borderRadius: 14,
  },
  mainWords: { fontFamily: font.bold, fontSize: 16, lineHeight: 22 },
});
