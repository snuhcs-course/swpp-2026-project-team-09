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
import { color, radius, space, text } from './tokens';

export interface GridChoice {
  key: string;
  name: string;
  // The one fact that decides the choice, such as "350m"; "" for none.
  value: string;
  // The value in the faint ink, as for a fact that is not known.
  faint: boolean;
  // What a screen reader says of the cell: the whole fact.
  label: string;
  // The choice is on its way: a spinner before the value, which says so, on the pressed cell's ground, and no press.
  busy?: boolean;
}

interface ChoiceGridProps {
  choices: readonly GridChoice[];
  disabled: boolean;
  onChoose: (key: string) => void;
  // The most rows shown at once: the rest scroll inside a window of whole rows. Without it every row is shown.
  rows?: number;
  // Cells in a row, two unless said.
  columns?: number;
}

const COLUMNS = 2;
const CELL_HEIGHT = 44;
const GAP = space[2];
const FADE_HEIGHT = space[4];
const SPINNER = 16;

function heightOf(rows: number): number {
  return rows * CELL_HEIGHT + (rows - 1) * GAP;
}

// How many whole rows of cells stand within a height.
export function choiceRowsWithin(height: number): number {
  return Math.max(0, Math.floor((height + GAP) / (CELL_HEIGHT + GAP)));
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
  const { key, name, value, faint, label, busy = false } = choice;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={() => {
        onChoose(key);
      }}
      style={({ pressed }): StyleProp<ViewStyle> => [
        styles.cell,
        (pressed || busy) && styles.pressed,
        disabled && !busy && styles.disabled,
      ]}
    >
      <Text numberOfLines={1} style={styles.name}>
        {name}
      </Text>
      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={color.snuBlue} size={SPINNER} testID="choice-grid-spinner" />
          <Text numberOfLines={1} style={styles.busyValue}>
            {value}
          </Text>
        </View>
      ) : (
        <Text numberOfLines={1} style={[styles.value, faint && styles.faint]}>
          {value}
        </Text>
      )}
    </Pressable>
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

// A list of choices inside a card: columns of equal cells, filled row by row, each with a name at the left and
// the one value that decides the choice at the right, so that the names and the values stand in straight columns.
export function ChoiceGrid(props: ChoiceGridProps): ReactElement {
  const { choices, disabled, onChoose, rows: most, columns = COLUMNS } = props;
  const rows = Array.from({ length: Math.ceil(choices.length / columns) }, (_, row) =>
    choices.slice(row * columns, (row + 1) * columns),
  );
  const grid = (
    <View style={styles.grid} testID="choice-grid">
      {rows.map((row) => (
        <View key={row.map(({ key }) => key).join(' ')} style={styles.row}>
          {row.map((choice) => (
            <Cell choice={choice} disabled={disabled} key={choice.key} onChoose={onChoose} />
          ))}
          {/* An odd last cell keeps its column's width. */}
          {Array.from({ length: columns - row.length }, (_, empty) => (
            <View key={`empty ${empty}`} style={styles.empty} testID="choice-grid-empty" />
          ))}
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
  pressed: { backgroundColor: color.blue50 },
  disabled: { opacity: 0.5 },
  name: { ...text.label, flexShrink: 1, color: color.ink },
  // The rest of the cell, so that the value is what gives way first.
  value: { ...text.caption, flex: 1, color: color.inkMuted, textAlign: 'right' },
  faint: { color: color.inkSubtle },
  busy: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space[1] },
  busyValue: { ...text.caption, flexShrink: 1, color: color.snuBlue },
  empty: { flex: 1 },
  fade: { position: 'absolute', right: 0, bottom: 0, left: 0 },
});
