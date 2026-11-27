/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, use, useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { FoldTab, pressedTo, pulledTo, TAB, type TopStop, type TopStops, TopTab } from './top-stops';

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
      style={[styles.bar, { top: barTop(top) }]}
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
// The top folds in stops (P01 ticket 22, `top-stops.tsx`): 2, both cards; 1, the steps card with a tab under it, the
// Plan's bar behind it; 0, one tab at the top's centre. A step with no Plan's bar (a seat or a room) shows its steps
// card with the tab, which folds to 0 and opens nothing downward. The sheet rising to high folds 2 to 1.
export function StepsTop({ control, focus, onClose, onHeight }: StepsTopProps): ReactElement | null {
  const [heights, setHeights] = useState({ steps: 0, plan: 0 });
  const sheet = use(SheetLinkContext);
  const stops = sheet.top;
  const stop = stops?.stop ?? 2;
  const { steps, activeStep, setActiveStep, answer: shown, invitation } = control;
  const { answer, plan } = shown;
  const withPlan = planStepShown(control) && answer !== null && plan !== null;
  const timeCard = stop === 2 && withPlan;
  const told = toldOf(stop, heights, timeCard);
  useEffect(() => {
    onHeight(told);
  }, [told, onHeight]);
  useFoldOnHigh(sheet.high, stops);
  if (steps === null) {
    return null;
  }
  if (stop === 0 && stops !== undefined) {
    return <TopTab several stops={stops} />;
  }
  return (
    <>
      <StepsBar
        active={activeStep}
        onHeight={(height) => {
          setHeights((last) => ({ ...last, steps: height }));
          stops?.setStepsHeight(height);
        }}
        onStep={setActiveStep}
        steps={steps.steps}
      />
      {timeCard ? (
        <PlanBar
          answer={answer}
          focus={focus}
          invitation={invitation}
          offset={heights.steps + space[2]}
          onClose={onClose}
          onHeight={(height) => {
            setHeights((last) => ({ ...last, plan: height }));
          }}
          plan={plan}
          shown={shown}
        />
      ) : (
        <StepsTab opens={withPlan} stepsHeight={heights.steps} stops={stops} />
      )}
    </>
  );
}

// The tab under the steps card's bottom centre: a press or a pull down brings the time card out, where the step has one;
// a pull up folds the steps card too.
function StepsTab({
  stops,
  opens,
  stepsHeight,
}: {
  stops: TopStops | undefined;
  opens: boolean;
  stepsHeight: number;
}): ReactElement {
  const { top } = useSafeAreaInsets();
  return (
    <FoldTab
      onPress={() => {
        if (opens) {
          stops?.setStop(pressedTo(1, true));
        }
      }}
      onPull={(dy) => {
        if (dy < 0 || opens) {
          stops?.setStop(pulledTo(1, dy, true));
        }
      }}
      testID="steps-tab"
      top={barTop(top) + stepsHeight}
    />
  );
}

// Whether the step shown is the reply's Plan, which has a time card: a seat or a room has none.
function planStepShown({ steps, activeStep }: ChatSheetControl): boolean {
  const step = steps?.steps[activeStep];
  return step !== undefined && step.status === 'shown' && step.kind !== 'seat' && step.kind !== 'room';
}

// What stands at the top, told: the tab at 0; the steps card with its tab, or with the Plan's bar under it.
function toldOf(stop: TopStop, heights: { steps: number; plan: number }, timeCard: boolean): number {
  if (stop === 0) {
    return TAB.height;
  }
  return heights.steps + (timeCard ? heights.plan + space[2] : TAB.height);
}

// The sheet rising to high folds the time card behind the steps card (the approved page, section 2 ④); lowering it
// leaves the fold, and a stop already folded further stays.
function useFoldOnHigh(high: boolean, stops: TopStops | undefined): void {
  const was = useRef(high);
  useEffect(() => {
    if (high && !was.current && stops?.stop === 2) {
      stops.setStop(1);
    }
    was.current = high;
  }, [high, stops]);
}
