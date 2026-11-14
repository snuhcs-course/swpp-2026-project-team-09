/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { ConditionChip } from '@/api/assistant-types';
import { color, Icon, radius, size, space, text } from '@/design-system';

// What stands at the right of the first line: "근거" or "근거 접기" with its chevron, or "그대로", which closes the list
// of Friends.
export interface CornerAction {
  // Also its name read aloud.
  words: string;
  icon: 'chevronRight' | 'chevronUp' | null;
  onPress: () => void;
}

interface ConditionChipsProps {
  chips: readonly ConditionChip[];
  // The list of Friends is open.
  adding: boolean;
  disabled: boolean;
  onOrigin: () => void;
  onUntil: () => void;
  onRemove: (userId: string) => void;
  onAdd: () => void;
  // Null for nothing there, as for an answer without a Plan, which has no basis.
  corner: CornerAction | null;
}

const CHIP_HEIGHT = 34;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;

function pressedStyle(base: StyleProp<ViewStyle>): ({ pressed }: { pressed: boolean }) => StyleProp<ViewStyle> {
  return ({ pressed }) => [base, pressed && styles.pressed];
}

interface ChipButtonProps {
  label: string;
  disabled: boolean;
  onPress: () => void;
}

function ChipButton({ label, disabled, onPress }: ChipButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={pressedStyle(styles.chip)}
    >
      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

// A chip that takes no press, in the look of the row's chips; `marked` draws it as a person's chip is drawn.
export function ReadOnlyChip({ label, marked }: { label: string; marked: boolean }): ReactElement {
  return (
    <View style={[styles.chip, marked && styles.person]}>
      <Text numberOfLines={1} style={[styles.label, marked && styles.personLabel]}>
        {label}
      </Text>
    </View>
  );
}

interface PersonChipProps {
  chip: ConditionChip;
  disabled: boolean;
  onRemove: (userId: string) => void;
}

function PersonChip({ chip, disabled, onRemove }: PersonChipProps): ReactElement {
  const { userId } = chip;
  return (
    <View style={[styles.chip, styles.person]}>
      <Text numberOfLines={1} style={[styles.label, styles.personLabel]}>
        {chip.text}
      </Text>
      {userId === null ? null : (
        <Pressable
          accessibilityLabel={`${chip.text} 빼기`}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={HIT_SLOP}
          onPress={() => {
            onRemove(userId);
          }}
          style={pressedStyle(styles.remove)}
        >
          <Icon color={color.snuBlue} name="x" size={14} />
        </Pressable>
      )}
    </View>
  );
}

function AddChip({ adding, disabled, onAdd }: { adding: boolean; disabled: boolean; onAdd: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="같이 먹을 친구 추가"
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: adding }}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onAdd}
      style={pressedStyle([styles.chip, styles.add, adding && styles.adding])}
    >
      <Text style={[styles.label, adding && styles.personLabel]}>＋ 같이</Text>
    </Pressable>
  );
}

// The first row of the answer's card: the conditions the answer used, each a control that corrects it, then
// "＋ 같이", in lines that wrap so that no chip is cut, with the corner's action fixed at the right of the first line.
export function ConditionChips({ chips, adding, disabled, corner, ...on }: ConditionChipsProps): ReactElement {
  return (
    <View style={styles.row} testID="condition-chips">
      <View style={styles.chips} testID="condition-chips-lines">
        {chips.map((chip) =>
          chip.kind === 'person' ? (
            <PersonChip
              chip={chip}
              disabled={disabled}
              key={`person-${chip.userId ?? chip.text}`}
              onRemove={on.onRemove}
            />
          ) : (
            <ChipButton
              disabled={disabled}
              key={chip.kind}
              label={chip.text}
              onPress={chip.kind === 'origin' ? on.onOrigin : on.onUntil}
            />
          ),
        )}
        <AddChip adding={adding} disabled={disabled} onAdd={on.onAdd} />
      </View>
      {corner === null ? null : (
        <Pressable
          accessibilityLabel={corner.words}
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          onPress={corner.onPress}
          style={pressedStyle(styles.corner)}
        >
          <Text style={styles.cornerLabel}>{corner.words}</Text>
          {corner.icon === null ? null : <Icon color={color.blue600} name={corner.icon} size={14} />}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: CHIP_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  person: { borderColor: color.snuBlue, backgroundColor: color.blue50 },
  add: { borderStyle: 'dashed' },
  adding: { borderStyle: 'solid', borderColor: color.snuBlue, backgroundColor: color.blue100 },
  pressed: { opacity: 0.6 },
  label: { ...text.label, color: color.ink },
  personLabel: { color: color.snuBlue },
  remove: { marginRight: -space[1], padding: 2, borderRadius: radius.full },
  corner: { flexDirection: 'row', alignItems: 'center', gap: 2, height: CHIP_HEIGHT },
  cornerLabel: { ...text.label, color: color.blue600 },
});
