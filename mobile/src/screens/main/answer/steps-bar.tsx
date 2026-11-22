/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReplyStep } from '@/api/assistant-types';
import { now } from '@/clock';
import { color, font, radius, shadow, space, text } from '@/design-system';
import { stepClock } from '@/features/assistant/steps-scene';
import { koreaDayWord } from '@/korea-time';
import type { ChatSheetControl } from '../chat-sheet';
import { PlanBar, sheetPlace } from './time-bar';
import type { BandFocus } from './use-corrections';

const MINUTE = 60_000;
// The bar's ends stand this far before the first step and after the last.
const MARGIN = 30 * MINUTE;
// A step with no end takes this long on the bar.
const NO_END = 30 * MINUTE;
const TRACK = 24;

// "①", "②", … for the steps' numbers.
export function circled(number: number): string {
  return String.fromCodePoint(0x24_5f + number);
}

// What a step is, in a word: "자리", "방", or the last word of its title ("저녁").
function wordOf(step: ReplyStep): string {
  if (step.kind === 'seat') {
    return '자리';
  }
  if (step.kind === 'room') {
    return '방';
  }
  return step.title.split(' ').at(-1) ?? step.title;
}

interface Span {
  index: number;
  step: ReplyStep;
  start: number;
  end: number;
}

function spansOf(steps: readonly ReplyStep[]): Span[] {
  return steps.flatMap((step, index): Span[] => {
    if (step.startAt === null) {
      return [];
    }
    const start = Date.parse(step.startAt);
    const end = step.endAt === null ? start + NO_END : Date.parse(step.endAt);
    return [{ index, step, start, end }];
  });
}

function percent(share: number): `${number}%` {
  return `${share}%`;
}

// The track with one span a step.
function Track({
  spans,
  active,
  share,
}: {
  spans: Span[];
  active: number;
  share: (at: number) => number;
}): ReactElement {
  return (
    <View style={styles.track}>
      {spans.map(({ index, step, start, end }) => (
        <View
          key={index}
          style={[
            styles.span,
            { left: percent(share(start)), width: percent(share(end) - share(start)) },
            index === active ? styles.spanActive : null,
            step.status === 'shown' ? null : styles.spanNot,
          ]}
          testID={`step-span-${String(index + 1)}`}
        />
      ))}
    </View>
  );
}

interface StepsBarProps {
  steps: readonly ReplyStep[];
  active: number;
  onStep: (index: number) => void;
  onHeight: (height: number) => void;
}

// The bar of several requests (P04 ticket 09, board 12): one span a step with a time, numbered as its flag, and the
// steps' words over them; a press on a step's words or span makes it the step shown. A step not done is faint. Its
// time is changed on the step's own card.
export function StepsBar({ steps, active, onStep, onHeight }: StepsBarProps): ReactElement | null {
  const { top } = useSafeAreaInsets();
  const spans = spansOf(steps);
  const [first] = spans;
  if (first === undefined) {
    return null;
  }
  const from = Math.min(...spans.map(({ start }) => start)) - MARGIN;
  const to = Math.max(...spans.map(({ end }) => end)) + MARGIN;
  const share = (at: number): number => ((at - from) / (to - from)) * 100;
  const day = koreaDayWord(first.step.startAt ?? '', now());
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        onHeight(nativeEvent.layout.height);
      }}
      style={[styles.bar, sheetPlace(top)]}
      testID="time-bar"
    >
      <View style={styles.words}>
        {spans.map(({ index, step }) => (
          <Pressable
            accessibilityLabel={`${String(index + 1)}번 ${wordOf(step)} ${stepClock(step) ?? ''}`}
            accessibilityRole="button"
            accessibilityState={{ selected: index === active }}
            key={index}
            onPress={() => {
              onStep(index);
            }}
          >
            <Text style={[styles.word, index === active && styles.wordActive, step.status !== 'shown' && styles.faint]}>
              {`${circled(index + 1)} ${wordOf(step)} ${stepClock(step) ?? ''}`}
            </Text>
          </Pressable>
        ))}
      </View>
      <Track active={active} share={share} spans={spans} />
      {day === '' ? null : <Text style={styles.day}>{day}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  // The answer's top sheet, as the time bar (`sheetPlace`).
  bar: {
    position: 'absolute',
    right: 0,
    left: 0,
    gap: space[2],
    paddingBottom: space[3],
    paddingHorizontal: space[4],
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.sheet,
  },
  // From the bar's left edge, "←" being under the bar (P04 ticket 52).
  words: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space[3],
  },
  word: { ...text.label, color: color.inkMuted },
  wordActive: { fontFamily: font.semiBold, color: color.snuBlue },
  faint: { color: color.inkSubtle },
  track: { height: TRACK, borderRadius: radius.full, backgroundColor: color.border },
  span: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
    opacity: 0.55,
  },
  spanActive: { opacity: 1 },
  spanNot: { backgroundColor: color.inkSubtle },
  day: { ...text.caption, color: color.inkMuted },
});

interface StepsTopProps {
  control: ChatSheetControl;
  focus: BandFocus;
  onClose: () => void;
  onHeight: (height: number) => void;
}

// The bar of several requests, and under it, while the step shown is the reply's Plan, that Plan's bar with its
// handles and its meal's tick, as on a reply to one request (PR 462's review). The height told is both.
export function StepsTop({ control, focus, onClose, onHeight }: StepsTopProps): ReactElement | null {
  const [heights, setHeights] = useState({ steps: 0, plan: 0 });
  const { steps, activeStep, setActiveStep, answer: shown, invitation } = control;
  const step = steps?.steps[activeStep];
  const planStep = step !== undefined && step.status === 'shown' && step.kind !== 'seat' && step.kind !== 'room';
  const { answer, plan } = shown;
  const withPlan = planStep && answer !== null && plan !== null;
  const told = heights.steps + (withPlan ? heights.plan : 0);
  useEffect(() => {
    onHeight(told);
  }, [told, onHeight]);
  if (steps === null) {
    return null;
  }
  return (
    <>
      <StepsBar
        active={activeStep}
        onHeight={(height) => {
          setHeights((last) => ({ ...last, steps: height }));
        }}
        onStep={setActiveStep}
        steps={steps.steps}
      />
      {withPlan ? (
        <PlanBar
          answer={answer}
          focus={focus}
          invitation={invitation}
          offset={heights.steps}
          onClose={onClose}
          onHeight={(height) => {
            setHeights((last) => ({ ...last, plan: height }));
          }}
          plan={plan}
          shown={shown}
        />
      ) : null}
    </>
  );
}
