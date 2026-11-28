/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, use, useCallback, useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReplyStep } from '@/api/assistant-types';
import { now } from '@/clock';
import { color, font, Icon, kindTone, radius, shadow, space, text } from '@/design-system';
import { stepIcon, stepTone } from '@/features/assistant/answer-tone';
import { stepClock } from '@/features/assistant/steps-scene';
import { koreaDayWord } from '@/korea-time';
import { ANSWER_TOP } from '../layout';
import type { ChatSheetControl } from '../chat-sheet';
import { barTop } from './time-bar';
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
// A step's icon, as high as its words' letters.
const WORD_ICON = 16;

// What a step is, in a word: what the User does then. A seat, a room, and a study place all read "공부" (the user's
// phone, 2026-11-28: "자리라는 텍스트 보다는 공부가 낫지 않을까?"); where, the step's flag and card say. Any other step
// reads the last word of its title ("저녁").
function wordOf(step: ReplyStep): string {
  if (step.kind === 'seat' || step.kind === 'room') {
    return '공부';
  }
  return step.title.split(' ').at(-1) ?? step.title;
}

// A step's word and its time ("공부 17:30–19:00").
function wordsOf(step: ReplyStep): string {
  const clock = stepClock(step);
  return clock === null ? wordOf(step) : `${wordOf(step)} ${clock}`;
}

// A span's press is this high over its own width, so that a press on it chooses its step as its words do, and the gaps
// between spans take none (P03 ticket 25). It is a box of its own, not a hit slop: Android sends no touch to a child
// outside its parent's bounds. Over the track it takes the bar's gap above, up to the words, and the rest below, the
// bar's padding or the day's line, which takes no touch.
const SPAN_TOUCH = 44;
const ABOVE_TRACK = space[2];

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

// Where a time falls on the bar, as a share (0–100) of its range, which runs from the first step's start to the last
// one's end with the margin before and after.
function shareOf(spans: Span[]): (at: number) => number {
  const from = Math.min(...spans.map(({ start }) => start)) - MARGIN;
  const to = Math.max(...spans.map(({ end }) => end)) + MARGIN;
  return (at) => ((at - from) / (to - from)) * 100;
}

// Where the time card's caret points (P01 ticket 23): the chosen step's span's middle, as a share of the bar's range;
// left out when that step has no time.
export function caretOf(steps: readonly ReplyStep[], active: number): number | undefined {
  const spans = spansOf(steps);
  const span = spans.find(({ index }) => index === active);
  return span === undefined ? undefined : shareOf(spans)((span.start + span.end) / 2);
}

// The track with one span a step, each span a press as high as `SPAN_TOUCH`.
function Track({
  spans,
  active,
  share,
  onStep,
}: {
  spans: Span[];
  active: number;
  share: (at: number) => number;
  onStep: (index: number) => void;
}): ReactElement {
  return (
    <View style={styles.spans} testID="step-spans">
      <View style={styles.track} />
      {spans.map(({ index, step, start, end }) => (
        // A screen reader reaches the step by its words, which say it; the span is the same press for a finger.
        <Pressable
          accessible={false}
          key={index}
          onPress={() => {
            onStep(index);
          }}
          style={[styles.spanTouch, { left: percent(share(start)), width: percent(share(end) - share(start)) }]}
          testID={`step-span-${String(index + 1)}-touch`}
        >
          <View
            style={[
              styles.span,
              index === active ? styles.spanActive : null,
              step.status === 'shown' ? null : styles.spanNot,
            ]}
            testID={`step-span-${String(index + 1)}`}
          />
        </Pressable>
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

// The bar of several requests (P04 ticket 09, board 12): one span a step with a time, and the steps' words over them,
// each its kind's icon, its word and its time, with no number: numbers mean an answer's candidates alone, and the
// times tell the order (P03 ticket 26). A press on a step's words or span makes it the step shown. A step not done is
// faint. Its time is changed on the step's own card.
export function StepsBar({ steps, active, onStep, onHeight, stops }: StepsBarProps): ReactElement | null {
  const { top } = useSafeAreaInsets();
  const lifted = useLifted(stops, top);
  const spans = spansOf(steps);
  const [first] = spans;
  if (first === undefined) {
    return null;
  }
  const share = shareOf(spans);
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
            accessibilityLabel={wordsOf(step)}
            accessibilityRole="button"
            accessibilityState={{ selected: index === active }}
            key={index}
            onPress={() => {
              onStep(index);
            }}
            style={styles.step}
            testID={`step-word-${String(index + 1)}`}
          >
            <Icon color={kindTone[stepTone(step)].ink} name={stepIcon(step.kind)} size={WORD_ICON} />
            <Text style={[styles.word, index === active && styles.wordActive, step.status !== 'shown' && styles.faint]}>
              {wordsOf(step)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Track active={active} onStep={onStep} share={share} spans={spans} />
      {day === '' ? null : (
        <View style={styles.dayRow}>
          <Text style={styles.day}>{day}</Text>
        </View>
      )}
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
  step: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  word: { ...text.label, color: color.inkMuted },
  // The chosen step in the time card's gold, its span drawn as the card's band (P01 ticket 23).
  wordActive: { fontFamily: font.semiBold, color: color.quest },
  faint: { color: color.inkSubtle },
  // The track keeps its place between the words and the day: its press box reaches over the gap above and below it.
  spans: { height: SPAN_TOUCH, marginTop: -ABOVE_TRACK, marginBottom: TRACK + ABOVE_TRACK - SPAN_TOUCH },
  track: {
    position: 'absolute',
    top: ABOVE_TRACK,
    right: 0,
    left: 0,
    height: TRACK,
    borderRadius: radius.full,
    backgroundColor: color.border,
  },
  spanTouch: { position: 'absolute', top: 0, bottom: 0 },
  span: {
    position: 'absolute',
    top: ABOVE_TRACK,
    right: 0,
    left: 0,
    height: TRACK,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
    opacity: 0.55,
  },
  spanActive: { opacity: 1, borderWidth: 2, borderColor: color.quest, backgroundColor: color.questSoft },
  spanNot: { backgroundColor: color.inkSubtle },
  // Under the spans' press box, which reaches over its top.
  dayRow: { pointerEvents: 'none' },
  day: { ...text.caption, color: color.inkMuted },
});

// Where the chosen step's top card stands under the steps card: how far below its place, where its caret points (P01
// ticket 23), and the height it tells.
export interface CardPlace {
  offset: number;
  caret: number | undefined;
  onHeight: (height: number) => void;
}

interface StepsTopProps {
  control: Pick<ChatSheetControl, 'steps' | 'activeStep' | 'setActiveStep'>;
  // The chosen step's top card, drawn where it is placed; null for a step with none (`stepTopCardOf`).
  drawCard: ((place: CardPlace) => ReactElement | null) | null;
  onHeight: (height: number) => void;
}

// The bar of several requests, and under it the chosen step's top card, the one its answer draws alone (P03 ticket 23):
// a Plan's bar with its handles and its meal's tick, or a seat's booking card. The height told is what stands at the
// top. The top folds in stops (P01 ticket 22, `top-stops.tsx`): the card folds behind the steps card to its grip
// strip, then takes the steps card up with it to the stage's top, out of sight above it; both stay mounted, moved on
// the UI thread. A step with no top card has a strip of its own in that place (`steps-strip.tsx`), which folds the
// same way and opens nothing downward.
export function StepsTop({ control, drawCard, onHeight }: StepsTopProps): ReactElement | null {
  const stops = use(SheetLinkContext).top;
  const { heights, onSteps, onCard } = useHeights(stops?.setStepsHeight);
  const { steps, activeStep, setActiveStep } = control;
  useTold(toldOf(stops?.stop ?? 2, heights, drawCard !== null), onHeight);
  if (steps === null) {
    return null;
  }
  const place = { offset: heights.steps + space[2], caret: caretOf(steps.steps, activeStep), onHeight: onCard };
  return (
    <View style={styles.stage} testID="steps-top">
      <StepsBar active={activeStep} onHeight={onSteps} onStep={setActiveStep} steps={steps.steps} stops={stops} />
      {drawCard === null ? stops === undefined ? null : <StepsStrip stops={stops} /> : drawCard(place)}
    </View>
  );
}

// What stands at the top, told: the strip alone at 0; the steps card with the top card under it at 2, else with the
// strip under it.
function toldOf(stop: TopStop, heights: { steps: number; card: number }, withCard: boolean): number {
  if (stop === 0) {
    return TUCK_STRIP;
  }
  return heights.steps + (stop === 2 && withCard ? heights.card + space[2] : TUCK_STRIP);
}

// The two cards' heights as laid out, kept by callbacks that stay the same from render to render and keep the same
// state for the same height: the top card tells its height in an effect whenever its callback changes
// (`folded-height.ts`), so a new callback or a new state each render told it again without end.
function useHeights(setStepsHeight?: (height: number) => void): {
  heights: { steps: number; card: number };
  onSteps: (height: number) => void;
  onCard: (height: number) => void;
} {
  const [heights, setHeights] = useState({ steps: 0, card: 0 });
  const onSteps = useCallback(
    (height: number): void => {
      setHeights((last) => (last.steps === height ? last : { ...last, steps: height }));
      setStepsHeight?.(height);
    },
    [setStepsHeight],
  );
  const onCard = useCallback((height: number): void => {
    setHeights((last) => (last.card === height ? last : { ...last, card: height }));
  }, []);
  return { heights, onSteps, onCard };
}

function useTold(told: number, onHeight: (height: number) => void): void {
  useEffect(() => {
    onHeight(told);
  }, [told, onHeight]);
}
