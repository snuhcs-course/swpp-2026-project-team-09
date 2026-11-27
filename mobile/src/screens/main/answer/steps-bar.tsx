/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, use, useCallback, useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReplyStep } from '@/api/assistant-types';
import { now } from '@/clock';
import { color, font, radius, shadow, space, text } from '@/design-system';
import { stepClock } from '@/features/assistant/steps-scene';
import { koreaDayWord } from '@/korea-time';
import { ANSWER_TOP } from '../layout';
import type { ChatSheetControl } from '../chat-sheet';
import { barTop, PlanBar } from './time-bar';
import type { BandFocus } from './use-corrections';
import { SheetLinkContext } from './sheet-link';
import { StepsStrip } from './steps-strip';
import { TUCK_STRIP } from './time-card-grip';
import { restingLift, type TopStop, type TopStops } from './top-stops';

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
  // The top's stops, whose lift takes the bar up past stop 1 (P01 ticket 22).
  stops?: TopStops;
}

// Where the bar stands as the top folds: moved on the UI thread by the lift, resting where its stop puts it.
function useLifted(
  stops: TopStops | undefined,
  top: number,
): { moved: ReturnType<typeof useAnimatedStyle<ViewStyle>>; rested: ViewStyle } {
  const lift = stops?.lift;
  const moved = useAnimatedStyle<ViewStyle>(() => ({ transform: [{ translateY: lift?.value ?? 0 }] }));
  const at = stops === undefined ? 0 : restingLift(stops.stop, barTop(top) + stops.stepsHeight);
  return { moved, rested: { transform: [{ translateY: at }] } };
}

// The bar of several requests (P04 ticket 09, board 12): one span a step with a time, numbered as its flag, and the
// steps' words over them; a press on a step's words or span makes it the step shown. A step not done is faint. Its
// time is changed on the step's own card.
export function StepsBar({ steps, active, onStep, onHeight, stops }: StepsBarProps): ReactElement | null {
  const { top } = useSafeAreaInsets();
  const lifted = useLifted(stops, top);
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
    <Reanimated.View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        onHeight(nativeEvent.layout.height);
      }}
      style={[styles.bar, { top: barTop(top) }, lifted.moved, lifted.rested]}
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
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  // The stage under the status bar, which the top's cards are drawn within: gone up at stop 0, nothing of them shows
  // behind the status bar but the strip below it (P01 ticket 22).
  stage: { ...StyleSheet.absoluteFill, overflow: 'hidden', pointerEvents: 'box-none' },
  bar: {
    position: 'absolute',
    right: ANSWER_TOP.side,
    left: ANSWER_TOP.side,
    gap: space[2],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
    // Over the time card, which folds behind it (P01 ticket 22).
    zIndex: 1,
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
// handles and its meal's tick, as on a reply to one request (PR 462's review). The height told is what stands at the top.
// The top folds in stops (P01 ticket 22, `top-stops.tsx`): the Plan's bar folds behind the steps card to its grip
// strip, then takes the steps card up with it to the stage's top, out of sight above it; both stay mounted, moved on
// the UI thread. A step with
// no Plan's bar (a seat or a room) has a strip of its own in that place (`steps-strip.tsx`), which folds the same way
// and opens nothing downward.
export function StepsTop({ control, focus, onClose, onHeight }: StepsTopProps): ReactElement | null {
  const stops = use(SheetLinkContext).top;
  const { heights, onSteps, onPlan } = useHeights(stops?.setStepsHeight);
  const { steps, activeStep, setActiveStep, answer: shown, invitation } = control;
  const { answer, plan } = shown;
  const withPlan = planStepShown(control) && answer !== null && plan !== null;
  useTold(toldOf(stops?.stop ?? 2, heights, withPlan), onHeight);
  if (steps === null) {
    return null;
  }
  return (
    <View style={styles.stage} testID="steps-top">
      <StepsBar active={activeStep} onHeight={onSteps} onStep={setActiveStep} steps={steps.steps} stops={stops} />
      {withPlan ? (
        <PlanBar
          answer={answer}
          focus={focus}
          invitation={invitation}
          offset={heights.steps + space[2]}
          onClose={onClose}
          onHeight={onPlan}
          plan={plan}
          shown={shown}
        />
      ) : stops === undefined ? null : (
        <StepsStrip stops={stops} />
      )}
    </View>
  );
}

// Whether the step shown is the reply's Plan, which has a time card: a seat or a room has none.
function planStepShown({ steps, activeStep }: ChatSheetControl): boolean {
  const step = steps?.steps[activeStep];
  return step !== undefined && step.status === 'shown' && step.kind !== 'seat' && step.kind !== 'room';
}

// What stands at the top, told: the strip alone at 0; the steps card with the Plan's bar under it at 2, else with the
// strip under it.
function toldOf(stop: TopStop, heights: { steps: number; plan: number }, withPlan: boolean): number {
  if (stop === 0) {
    return TUCK_STRIP;
  }
  return heights.steps + (stop === 2 && withPlan ? heights.plan + space[2] : TUCK_STRIP);
}

// The two cards' heights as laid out, kept by callbacks that stay the same from render to render and keep the same
// state for the same height: the Plan's bar tells its height in an effect whenever its callback changes
// (`folded-height.ts`), so a new callback or a new state each render told it again without end.
function useHeights(setStepsHeight?: (height: number) => void): {
  heights: { steps: number; plan: number };
  onSteps: (height: number) => void;
  onPlan: (height: number) => void;
} {
  const [heights, setHeights] = useState({ steps: 0, plan: 0 });
  const onSteps = useCallback(
    (height: number): void => {
      setHeights((last) => (last.steps === height ? last : { ...last, steps: height }));
      setStepsHeight?.(height);
    },
    [setStepsHeight],
  );
  const onPlan = useCallback((height: number): void => {
    setHeights((last) => (last.plan === height ? last : { ...last, plan: height }));
  }, []);
  return { heights, onSteps, onPlan };
}

function useTold(told: number, onHeight: (height: number) => void): void {
  useEffect(() => {
    onHeight(told);
  }, [told, onHeight]);
}
