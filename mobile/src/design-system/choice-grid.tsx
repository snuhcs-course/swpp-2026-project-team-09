/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useId, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Icon } from './icon';
import { color, radius, space, text } from './tokens';

export interface GridChoice {
  key: string;
  name: string;
  // A second line under the name in small muted text, such as a person's department.
  sub?: string;
  // The one fact that decides the choice, such as "350m"; "" for none.
  value: string;
  // The value in the faint ink, as for a fact that is not known.
  faint: boolean;
  // What a screen reader says of the cell: the whole fact.
  label: string;
  // The choice is on its way: a spinner before the value, which says so, on the pressed cell's ground, and no press.
  busy?: boolean;
  // A small mark at the cell's end, its own button read as `label` ("김민수 프로필"), which opens something about the
  // choice without choosing it, also while the grid takes no choice.
  more?: { label: string; onPress: () => void };
}

interface ChoiceGridProps {
  choices: readonly GridChoice[];
  disabled: boolean;
  onChoose: (key: string) => void;
  // The most rows shown at once: the rest scroll inside a window of whole rows. Without it every row is shown.
  rows?: number;
}

const COLUMNS = 2;
const CELL_HEIGHT = 44;
const GAP = space[2];
const FADE_HEIGHT = space[4];
const SPINNER = 16;
// The mark's touch area, a square as high as the cell.
const MARK = 44;
const MARK_ICON = 16;

function heightOf(rows: number): number {
  return rows * CELL_HEIGHT + (rows - 1) * GAP;
}

// How many whole rows of cells stand within a height.
export function choiceRowsWithin(height: number): number {
  return Math.max(0, Math.floor((height + GAP) / (CELL_HEIGHT + GAP)));
}

// The name, with the second line under it. Beside a second line the value keeps its width and the names give way.
function Names({ choice }: { choice: Pick<GridChoice, 'name' | 'sub'> }): ReactElement {
  const named = (
    <Text numberOfLines={1} style={styles.name}>
      {choice.name}
    </Text>
  );
  return choice.sub === undefined ? (
    named
  ) : (
    <View style={styles.names}>
      {named}
      <Text numberOfLines={1} style={styles.sub}>
        {choice.sub}
      </Text>
    </View>
  );
}

function MoreMark({ more }: { more: NonNullable<GridChoice['more']> }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={more.label}
      accessibilityRole="button"
      onPress={more.onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.mark, pressed && styles.pressed]}
    >
      <Icon color={color.inkMuted} name="info" size={MARK_ICON} />
    </Pressable>
  );
}

// The value at the cell's right, or, while the choice is on its way, a spinner before it.
function Value({
  value,
  faint,
  busy = false,
  sub,
}: Pick<GridChoice, 'value' | 'faint' | 'busy' | 'sub'>): ReactElement {
  const kept = sub !== undefined && styles.kept;
  return busy ? (
    <View style={[styles.busy, kept]}>
      <ActivityIndicator color={color.snuBlue} size={SPINNER} testID="choice-grid-spinner" />
      <Text numberOfLines={1} style={styles.busyValue}>
        {value}
      </Text>
    </View>
  ) : (
    <Text numberOfLines={1} style={[styles.value, faint && styles.faint, kept]}>
      {value}
    </Text>
  );
}

function Cell({
  choice,
  disabled,
  onChoose,
}: {
  choice: GridChoice;
  disabled: boolean;
  onChoose: (key: string) => void;
}): ReactElement {
  const { key, sub, value, faint, label, busy = false, more } = choice;
  const body = (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={() => {
        onChoose(key);
      }}
      style={({ pressed }): StyleProp<ViewStyle> => [
        more === undefined ? styles.cell : styles.body,
        (pressed || busy) && styles.pressed,
        disabled && !busy && styles.disabled,
      ]}
    >
      <Names choice={choice} />
      <Value busy={busy} faint={faint} sub={sub} value={value} />
    </Pressable>
  );
  // The cell's frame is drawn over its body and its mark, so that each takes the whole height.
  return more === undefined ? (
    body
  ) : (
    <View style={styles.framed}>
      {body}
      <MoreMark more={more} />
      <View style={styles.frame} />
    </View>
  );
}

// A fade from the card's white over the window's bottom edge.
function BottomFade(): ReactElement {
  // Unique on the page, and only letters, digits, `_` and `-`, as an SVG `url(#…)` needs.
  const id = `choice-fade${useId().replaceAll(/[^\w-]/gu, '')}`;
  return (
    <Svg height={FADE_HEIGHT} pointerEvents="none" style={styles.fade} testID="choice-grid-fade" width="100%">
      <Defs>
        <LinearGradient id={id} x1="0" x2="0" y1="1" y2="0">
          <Stop offset="0" stopColor={color.surface} stopOpacity={1} />
          <Stop offset="1" stopColor={color.surface} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect fill={`url(#${id})`} height={FADE_HEIGHT} width="100%" />
    </Svg>
  );
}

interface Extent {
  view: number;
  content: number;
  offset: number;
}

// Whether rows are hidden below the window: the content is taller than the window and not scrolled to its end. Only
// a change of that renders again, not every step of a scroll.
function useHiddenBelow(): {
  hiddenBelow: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  onContentSizeChange: (width: number, height: number) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
} {
  const extent = useRef<Extent>({ view: 0, content: 0, offset: 0 });
  const [hiddenBelow, setHiddenBelow] = useState(false);
  const update = (change: Partial<Extent>): void => {
    const next = { ...extent.current, ...change };
    extent.current = next;
    setHiddenBelow(next.view > 0 && next.offset < next.content - next.view - 1);
  };
  return {
    hiddenBelow,
    onLayout: ({ nativeEvent }) => {
      update({ view: nativeEvent.layout.height });
    },
    onContentSizeChange: (_, height) => {
      update({ content: height });
    },
    onScroll: ({ nativeEvent }) => {
      update({ offset: nativeEvent.contentOffset.y });
    },
  };
}

// The rows in a window `rows` high that scrolls inside the card, fading at the bottom while more rows are below.
function GridWindow({ rows, children }: { rows: number; children: ReactNode }): ReactElement {
  const { hiddenBelow, ...scrolls } = useHiddenBelow();
  return (
    <View>
      <ScrollView
        {...scrolls}
        nestedScrollEnabled
        scrollEventThrottle={16}
        style={{ maxHeight: heightOf(rows) }}
        testID="choice-grid-window"
      >
        {children}
      </ScrollView>
      {hiddenBelow ? <BottomFade /> : null}
    </View>
  );
}

// A list of choices inside a card: two columns of equal cells, filled row by row, each with a name at the left and
// the one value that decides the choice at the right, so that the names and the values stand in straight columns.
export function ChoiceGrid({ choices, disabled, onChoose, rows: most }: ChoiceGridProps): ReactElement {
  const rows = Array.from({ length: Math.ceil(choices.length / COLUMNS) }, (_, row) =>
    choices.slice(row * COLUMNS, (row + 1) * COLUMNS),
  );
  const grid = (
    <View style={styles.grid} testID="choice-grid">
      {rows.map((row) => (
        <View key={row.map(({ key }) => key).join(' ')} style={styles.row}>
          {row.map((choice) => (
            <Cell choice={choice} disabled={disabled} key={choice.key} onChoose={onChoose} />
          ))}
          {/* An odd last cell keeps its column's width. */}
          {row.length < COLUMNS ? <View style={styles.empty} testID="choice-grid-empty" /> : null}
        </View>
      ))}
    </View>
  );
  return most === undefined ? grid : <GridWindow rows={most}>{grid}</GridWindow>;
}

const styles = StyleSheet.create({
  grid: { gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  cell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: CELL_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  framed: {
    flex: 1,
    flexDirection: 'row',
    height: CELL_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.surface,
  },
  frame: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    pointerEvents: 'none',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: CELL_HEIGHT,
    paddingLeft: space[3],
  },
  mark: { alignItems: 'center', justifyContent: 'center', width: MARK, height: MARK },
  pressed: { backgroundColor: color.blue50 },
  disabled: { opacity: 0.5 },
  name: { ...text.label, flexShrink: 1, color: color.ink },
  names: { flex: 1, minWidth: 0 },
  sub: { ...text.caption, color: color.inkMuted },
  // The rest of the cell, so that the value is what gives way first.
  value: { ...text.caption, flex: 1, color: color.inkMuted, textAlign: 'right' },
  kept: { flex: 0 },
  faint: { color: color.inkSubtle },
  busy: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space[1] },
  busyValue: { ...text.caption, flexShrink: 1, color: color.snuBlue },
  empty: { flex: 1 },
  fade: { position: 'absolute', right: 0, bottom: 0, left: 0 },
});
