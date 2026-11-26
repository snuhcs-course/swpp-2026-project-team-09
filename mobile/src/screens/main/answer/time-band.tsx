/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import type { MealInput, TimeBand as TimeBandData } from '@/api/assistant-types';
import { color, radius, space } from '@/design-system';
import { clashesAt } from '@/features/assistant/band-move';
import {
  type BandBound,
  clockOf,
  droppedAt,
  onBandDay,
  HANDLE_WIDTH,
  handlesOutside,
  shareOf,
  type Stretch,
  stepped,
} from '@/features/assistant/time-band';
import { BandOnTrack, Ends, type HeldBand, percent, placeOf, redOf, Track, useWholeMove, wordsOf } from './band-body';
import { BandWords, type HeadRoom } from './band-head-words';
import { NowMark, Red, useShownBand } from './band-track';
import { SkippedBlocks, SkippedLine } from './skipped-classes';

interface TimeBandProps {
  band: TimeBandData;
  // What the User fixed: the window of the conditions, for the clashes.
  fixed: MealInput['window'];
  // A handle drawn emphasised.
  focus: BandBound | null;
  // A recalculation is on its way: the handles take nothing.
  disabled: boolean;
  // "HH:MM", when a handle is let go or stepped.
  onDrop: (bound: BandBound, time: string) => void;
  // False draws no handles, as for a Lookup's band, which is not recalculated.
  handles?: boolean;
  // Puts a Class left out back in the plan (P04 ticket 93); left out, its pills take no press.
  onPutBack?: (classId: string) => void;
  // The band's place while it is moved whole by a drag on its lanes, drawn in place of the Plan's.
  moving?: Stretch | null;
  // Where a drag on the lanes moves the band whole, and where it is let go or stepped. Without it nothing does.
  onMove?: (at: Stretch, letGo: boolean) => void;
  // The track over the free time around the span, as the time card always draws it, with what bounds the span between
  // its two end times; else over the band's whole range, with its two end times alone.
  folded?: boolean;
  // The span's day beside its words: "내일(수)", or nothing for today.
  day?: string;
  // In a bar's head: the room its buttons keep beside the words.
  head?: HeadRoom;
}

// A handle moved by a drag, or let go and held while the recalculation it asked for is on its way.
interface Moved {
  bound: BandBound;
  clock: string;
}

export const LANE_HEIGHT = 20;
const BAR_HEIGHT = 8;
// A handle takes a touch this wide, and its drag begins only on a sideways move, so that the card still scrolls over
// the band.
const HANDLE_TOUCH = 44;
const HANDLE_SLOP = (HANDLE_TOUCH - HANDLE_WIDTH) / 2;
// The space between a handle drawn outside a short band and the band (P01 ticket 17).
const HANDLE_HAIR = 2;
// Up and down too, so that a folded bar's handle, one lane high, still takes a touch the design system's height.
const HANDLE_SLOP_Y = (HANDLE_TOUCH - LANE_HEIGHT) / 2;
const PAN_STARTS = 10;

interface HandleProps {
  bound: BandBound;
  band: TimeBandData;
  shown: Stretch;
  trackWidth: number;
  focused: boolean;
  // Drawn outside the band, which is too short for both handles on its ends (P01 ticket 17).
  outside: boolean;
  disabled: boolean;
  onMove: (moved: Moved) => void;
  onLetGo: (moved: Moved) => void;
  // The lanes' drag that moves the band whole, which waits while the handle has the touch.
  whole: PanGesture;
}

// A handle's drag, which moves its end by the finger's distance and lets it go there.
function useHandlePan(props: HandleProps): PanGesture {
  const { bound, band, trackWidth, disabled, onMove, onLetGo, whole } = props;
  const own = bound === 'from' ? band.startAt : band.endAt;
  return useMemo(() => {
    const at = (translationX: number): Moved => ({
      bound,
      clock: droppedAt(bound, shareOf(own, band.range) + translationX / trackWidth, band),
    });
    return Gesture.Pan()
      .withTestId(`time-band-${bound}`)
      .runOnJS(true)
      .enabled(!disabled && trackWidth > 0)
      .blocksExternalGesture(whole)
      .hitSlop({ left: HANDLE_SLOP, right: HANDLE_SLOP, top: HANDLE_SLOP_Y, bottom: HANDLE_SLOP_Y })
      .activeOffsetX([-PAN_STARTS, PAN_STARTS])
      .failOffsetY([-PAN_STARTS, PAN_STARTS])
      .onUpdate(({ translationX }) => {
        onMove(at(translationX));
      })
      .onEnd(({ translationX }) => {
        onLetGo(at(translationX));
      });
  }, [bound, band, own, trackWidth, disabled, onMove, onLetGo, whole]);
}

function Handle(props: HandleProps): ReactElement {
  const { bound, band, shown, focused, outside, disabled, onLetGo } = props;
  const pan = useHandlePan(props);
  const time = bound === 'from' ? shown.startAt : shown.endAt;
  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityLabel={bound === 'from' ? '시작 시각' : '끝 시각'}
        accessibilityRole="adjustable"
        accessibilityState={{ disabled }}
        accessibilityValue={{ text: clockOf(time) }}
        collapsable={false}
        onAccessibilityAction={({ nativeEvent: { actionName } }) => {
          if (actionName === 'increment' || actionName === 'decrement') {
            onLetGo({ bound, clock: stepped(bound, actionName === 'increment' ? 1 : -1, band) });
          }
        }}
        style={[
          styles.handle,
          { left: percent(shareOf(time, band.range)) },
          outside && (bound === 'from' ? styles.outsideFrom : styles.outsideUntil),
          focused && styles.focused,
        ]}
        testID={`time-band-handle-${bound}`}
      >
        <View style={styles.grip} testID={`time-band-grip-${bound}`}>
          <View style={styles.gripLine} />
          <View style={styles.gripLine} />
        </View>
      </View>
    </GestureDetector>
  );
}

interface LanesProps {
  band: TimeBandData;
  fixed: MealInput['window'];
  moving: Stretch | null;
}

// Every lane on one row, each over the one before it: the people's busy stretches together (P04 ticket 61; a row for
// each person stands under the card's ends, `PersonRows`).
function Lanes({ band, fixed, moving }: LanesProps): ReactElement {
  return (
    <>
      {band.lanes.map((lane, at) => (
        <View
          key={lane.userId}
          style={[styles.lane, at > 0 && styles.stacked]}
          testID={`time-band-lane-${lane.userId}`}
        >
          <View style={[styles.bar, at > 0 && styles.clear]}>
            {lane.busy.map((stretch) => (
              <View key={`busy-${stretch.startAt}`} style={[styles.busy, placeOf(stretch, band.range)]} />
            ))}
            {at === 0 ? <SkippedBlocks range={band.range} skipped={band.skipped} /> : null}
            <Red range={band.range} stretches={redOf(lane, fixed, band, moving)} />
          </View>
        </View>
      ))}
      <NowMark band={band} />
    </>
  );
}

// While the band is moved whole, the parts of the busy stretches it covers, red on their lanes over the band and its
// handles, which would hide them: the handles cover most of a narrow band.
function RedOver({ band, moving }: Pick<LanesProps, 'band' | 'moving'>): ReactElement | null {
  if (moving === null) {
    return null;
  }
  return (
    <View style={styles.over} testID="time-band-red">
      {band.lanes.map((lane, at) => (
        <View key={lane.userId} style={[styles.lane, at > 0 && styles.stacked]} testID={`time-band-red-${lane.userId}`}>
          <View style={styles.redBar}>
            <Red range={band.range} stretches={clashesAt([lane], moving)} />
          </View>
        </View>
      ))}
    </View>
  );
}

interface MovedBand extends HeldBand {
  onMove: (moved: Moved) => void;
  onLetGo: (moved: Moved) => void;
}

// The band as drawn: the Plan's, or with a handle where it is dragged, or where it was let go until the
// recalculation it asked for ends or a new band comes.
function useMovedBand(band: TimeBandData, disabled: boolean, onDrop: TimeBandProps['onDrop']): MovedBand {
  const [moved, setMoved] = useState<Moved | null>(null);
  const [seen, setSeen] = useState({ band, disabled });
  if (seen.band !== band || seen.disabled !== disabled) {
    setSeen({ band, disabled });
    if (seen.band !== band || !disabled) {
      setMoved(null);
    }
  }
  const handlers = useMemo(
    () => ({
      onMove: (next: Moved): void => {
        if (!disabled) {
          setMoved(next);
        }
      },
      onLetGo: (next: Moved): void => {
        if (disabled) {
          return;
        }
        const own = clockOf(next.bound === 'from' ? band.startAt : band.endAt);
        setMoved(next.clock === own ? null : next);
        if (next.clock !== own) {
          onDrop(next.bound, next.clock);
        }
      },
    }),
    [band, disabled, onDrop],
  );
  const shown = {
    startAt: moved?.bound === 'from' ? onBandDay(moved.clock, band) : band.startAt,
    endAt: moved?.bound === 'until' ? onBandDay(moved.clock, band) : band.endAt,
  };
  return { shown, bound: moved?.bound ?? null, ...handlers };
}

// The time bar's band: its words with the day on top, then the people's busy stretches on one row, the line of now,
// and the band with a handle at each end, which a drag or a screen reader's step moves by five minutes, and lanes that
// move it whole. Folded, the track runs over the free time around the span; else over the whole range.
export function TimeBand(props: TimeBandProps): ReactElement {
  const {
    band: given,
    fixed,
    focus,
    disabled,
    onDrop,
    handles = true,
    moving = null,
    onMove,
    folded = false,
    day = '',
  } = props;
  const band = useShownBand(given, folded);
  const [trackWidth, setTrackWidth] = useState(0);
  const moved = useMovedBand(band, disabled, onDrop);
  const whole = useWholeMove(band, trackWidth, disabled, onMove);
  const shown = moving ?? moved.shown;
  const handle = (bound: BandBound): ReactElement => (
    <Handle
      band={band}
      bound={bound}
      disabled={disabled}
      focused={focus === bound}
      outside={handlesOutside(shown, band.range, trackWidth)}
      trackWidth={trackWidth}
      whole={whole}
      onLetGo={moved.onLetGo}
      onMove={moved.onMove}
      shown={shown}
    />
  );
  return (
    <View style={styles.timeBand}>
      <BandWords day={day} head={props.head} parts={wordsOf(band, moving, moved)} />
      <View style={styles.lanes}>
        <Track onWidth={setTrackWidth} whole={whole}>
          <Lanes band={band} fixed={fixed} moving={moving} />
          <BandOnTrack {...props} band={band} moving={moving} shown={shown} />
          {handles ? handle('from') : null}
          {handles ? handle('until') : null}
          <RedOver band={band} moving={moving} />
        </Track>
      </View>
      <Ends band={band} folded={folded} />
      <SkippedLine disabled={disabled} onPutBack={props.onPutBack} skipped={band.skipped} />
    </View>
  );
}

const styles = StyleSheet.create({
  timeBand: { gap: space[1] },
  lanes: { flexDirection: 'row' },
  lane: { height: LANE_HEIGHT, justifyContent: 'center' },
  stacked: { position: 'absolute', top: 0, right: 0, left: 0 },
  bar: { height: BAR_HEIGHT, borderRadius: radius.full, backgroundColor: color.surfaceSunken },
  // A folded lane over the first draws only its stretches, so that the lanes under it still show theirs.
  clear: { backgroundColor: 'transparent' },
  busy: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.full, backgroundColor: color.borderStrong },
  over: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
  redBar: { height: BAR_HEIGHT },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_WIDTH,
    marginLeft: -HANDLE_WIDTH / 2,
    borderWidth: 2,
    borderColor: color.quest,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Two short lines that say a handle is to be dragged, on a band of any width (P01 ticket 17).
  grip: { flexDirection: 'row', gap: 2 },
  gripLine: { width: 1.5, height: 8, borderRadius: 1, backgroundColor: color.quest },
  outsideFrom: { marginLeft: -(HANDLE_WIDTH + HANDLE_HAIR) },
  outsideUntil: { marginLeft: HANDLE_HAIR },
  focused: { borderWidth: 3, borderColor: color.focusRing },
});
