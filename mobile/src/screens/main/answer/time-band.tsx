/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useMemo, useState } from 'react';
import { type DimensionValue, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { PlanInput, TimeBand as TimeBandData } from '@/api/assistant-types';
import { color, radius, space, text } from '@/design-system';
import {
  type BandBound,
  clashes,
  clockOf,
  droppedAt,
  onBandDay,
  shareOf,
  type Stretch,
  stepped,
} from '@/features/assistant/time-band';

interface TimeBandProps {
  // Of the Plan on screen.
  band: TimeBandData;
  // What the User fixed, for the clashes.
  window: PlanInput['window'];
  // Where the band was before a drag: a dashed outline.
  ghost: Stretch | null;
  // A handle drawn emphasised.
  focus: BandBound | null;
  // A recalculation is on its way: the handles take nothing.
  disabled: boolean;
  // "HH:MM", when a handle is let go or stepped.
  onDrop: (bound: BandBound, time: string) => void;
}

// A handle moved by a drag, or let go and held while the recalculation it asked for is on its way.
interface Moved {
  bound: BandBound;
  clock: string;
}

const LANE_HEIGHT = 20;
const BAR_HEIGHT = 8;
const HANDLE_WIDTH = 16;
// A handle takes a touch this wide, and its drag begins only on a sideways move, so that the card still scrolls over
// the band.
const HANDLE_TOUCH = 44;
const HANDLE_SLOP = (HANDLE_TOUCH - HANDLE_WIDTH) / 2;
const PAN_STARTS = 10;
const NAME_WIDTH = 40;

function percent(share: number): DimensionValue {
  return `${share * 100}%`;
}

// The part of the track a stretch covers, as its left and its width.
function placeOf(stretch: Stretch, range: Stretch): { left: DimensionValue; width: DimensionValue } {
  const start = shareOf(stretch.startAt, range);
  return { left: percent(start), width: percent(shareOf(stretch.endAt, range) - start) };
}

interface HandleProps {
  bound: BandBound;
  band: TimeBandData;
  shown: Stretch;
  trackWidth: number;
  focused: boolean;
  disabled: boolean;
  onMove: (moved: Moved) => void;
  onLetGo: (moved: Moved) => void;
}

function Handle({ bound, band, shown, trackWidth, focused, disabled, onMove, onLetGo }: HandleProps): ReactElement {
  const own = bound === 'from' ? band.startAt : band.endAt;
  const pan = useMemo(() => {
    const at = (translationX: number): Moved => ({
      bound,
      clock: droppedAt(bound, shareOf(own, band.range) + translationX / trackWidth, band),
    });
    return Gesture.Pan()
      .withTestId(`time-band-${bound}`)
      .runOnJS(true)
      .enabled(!disabled && trackWidth > 0)
      .hitSlop({ left: HANDLE_SLOP, right: HANDLE_SLOP })
      .activeOffsetX([-PAN_STARTS, PAN_STARTS])
      .failOffsetY([-PAN_STARTS, PAN_STARTS])
      .onUpdate(({ translationX }) => {
        onMove(at(translationX));
      })
      .onEnd(({ translationX }) => {
        onLetGo(at(translationX));
      });
  }, [bound, band, own, trackWidth, disabled, onMove, onLetGo]);
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
        style={[styles.handle, { left: percent(shareOf(time, band.range)) }, focused && styles.focused]}
      />
    </GestureDetector>
  );
}

function Lanes({ band, window }: { band: TimeBandData; window: PlanInput['window'] }): ReactElement {
  return (
    <>
      {band.lanes.map(({ userId, busy }) => (
        <View key={userId} style={styles.lane}>
          <View style={styles.bar}>
            {busy.map((stretch) => (
              <View key={stretch.startAt} style={[styles.busy, placeOf(stretch, band.range)]} />
            ))}
            {clashes(busy, window, band).map((stretch) => (
              <View
                key={stretch.startAt}
                style={[styles.clash, placeOf(stretch, band.range)]}
                testID="time-band-clash"
              />
            ))}
          </View>
        </View>
      ))}
      <View style={[styles.now, { left: percent(shareOf(band.now, band.range)) }]} />
    </>
  );
}

interface MovedBand {
  shown: Stretch;
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
  return { shown, ...handlers };
}

// The time band of the answer's card: each person's busy stretches, the line of now, and the Plan's band with a
// handle at each end, which a drag or a screen reader's step moves by five minutes.
export function TimeBand({ band, window, ghost, focus, disabled, onDrop }: TimeBandProps): ReactElement {
  const [trackWidth, setTrackWidth] = useState(0);
  const moved = useMovedBand(band, disabled, onDrop);
  const handle = (bound: BandBound): ReactElement => (
    <Handle
      band={band}
      bound={bound}
      disabled={disabled}
      focused={focus === bound}
      trackWidth={trackWidth}
      {...moved}
    />
  );
  return (
    <View style={styles.timeBand}>
      <View style={styles.lanes}>
        <View style={styles.names}>
          {band.lanes.map(({ userId, name }) => (
            <Text key={userId} numberOfLines={1} style={styles.name}>
              {name}
            </Text>
          ))}
        </View>
        <View
          onLayout={({ nativeEvent: { layout } }) => {
            setTrackWidth(layout.width);
          }}
          style={styles.track}
          testID="time-band-track"
        >
          <Lanes band={band} window={window} />
          {ghost === null ? null : <View style={[styles.ghost, placeOf(ghost, band.range)]} testID="time-band-ghost" />}
          <View style={[styles.band, placeOf(moved.shown, band.range)]} />
          {handle('from')}
          {handle('until')}
        </View>
      </View>
      <View style={styles.ends}>
        <Text style={styles.end}>{clockOf(band.range.startAt)}</Text>
        <Text style={styles.end}>{clockOf(band.range.endAt)}</Text>
      </View>
      <Text style={styles.words}>{band.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  timeBand: { gap: space[1] },
  lanes: { flexDirection: 'row' },
  names: { width: NAME_WIDTH },
  name: { ...text.caption, height: LANE_HEIGHT, lineHeight: LANE_HEIGHT, color: color.inkMuted },
  track: { flex: 1 },
  lane: { height: LANE_HEIGHT, justifyContent: 'center' },
  bar: { height: BAR_HEIGHT, borderRadius: radius.full, backgroundColor: color.surfaceSunken },
  busy: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.full, backgroundColor: color.borderStrong },
  clash: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.full, backgroundColor: color.warning },
  now: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: color.me },
  ghost: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.quest,
    borderRadius: radius.sm,
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: color.quest,
    borderRadius: radius.sm,
    backgroundColor: color.questSoft,
  },
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
  },
  focused: { borderWidth: 3, borderColor: color.focusRing },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: NAME_WIDTH },
  end: { ...text.caption, color: color.inkSubtle },
  words: { ...text.label, color: color.quest, textAlign: 'center' },
});
