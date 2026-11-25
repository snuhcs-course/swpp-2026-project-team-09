/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { ConditionChip } from '@/api/assistant-types';
import { color, Icon, radius, size, space, text } from '@/design-system';
import { profileLabel } from '@/features/friends/profile';

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
  // A time chip pressed: it focuses the band, or eases or restores 지금 (P02-14).
  onUntil: (chip: ConditionChip) => void;
  onRemove: (userId: string) => void;
  onAdd: () => void;
  // Opens a person's profile from their chip, for the User's Friends (`friendIds`) alone; null for none.
  onProfile: ((userId: string) => void) | null;
  friendIds: ReadonlySet<string>;
  // Null for nothing there, as for an answer without a Plan, which has no basis.
  corner: CornerAction | null;
  // One of `chips` whose words a drag of the band is changing: drawn marked, as one the server eased.
  changed?: ConditionChip | null;
  // The name "＋ 같이" is read by, by what a Friend is added to ("같이 만날 친구 추가"); null leaves it out.
  addName?: string | null;
  // The where-from and time chips take no press: the answer's band is read-only.
  fixed?: boolean;
  // More chips after "＋ 같이": the docked card's (`DockChip`).
  extra?: ReactNode;
}

const CHIP_HEIGHT = 34;
const CHIP_BORDER = 1;
// "＋ 같이" in the time bar's head, the head row's height.
export const BAR_ADD_HEIGHT = 32;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;

function pressedStyle(base: StyleProp<ViewStyle>): ({ pressed }: { pressed: boolean }) => StyleProp<ViewStyle> {
  return ({ pressed }) => [base, pressed && styles.pressed];
}

interface ChipButtonProps {
  label: string;
  // Drawn in the Quest colour: the server assumed it, or eased it.
  marked: boolean;
  disabled: boolean;
  onPress: () => void;
}

function ChipButton({ label, marked, disabled, onPress }: ChipButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={pressedStyle([styles.chip, marked && styles.marked])}
    >
      <Text numberOfLines={1} style={[styles.label, marked && styles.markedLabel]}>
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
  // Null for someone whose profile does not open.
  onProfile: (() => void) | null;
}

// The chip's words take the chip's height inside its border and reach to its ✕, which keeps its own touch area at the
// right: as high a touch as a sibling chip's.
const NAME_SLOP_Y = (size.touchMin - (CHIP_HEIGHT - 2 * CHIP_BORDER)) / 2;
const NAME_SLOP = { top: NAME_SLOP_Y, bottom: NAME_SLOP_Y, left: HIT_SLOP } as const;

// A person's chip: their name, which opens their profile when they are a Friend, also while a recalculation is on its
// way, and the ✕ that takes them out.
function PersonChip({ chip, disabled, onRemove, onProfile }: PersonChipProps): ReactElement {
  const { userId } = chip;
  const named = (
    <Text numberOfLines={1} style={[styles.label, styles.personLabel]}>
      {chip.text}
    </Text>
  );
  return (
    <View style={[styles.chip, styles.person]}>
      {onProfile === null ? (
        named
      ) : (
        <Pressable
          accessibilityLabel={profileLabel(chip.text)}
          accessibilityRole="button"
          hitSlop={NAME_SLOP}
          onPress={onProfile}
          style={({ pressed }) => [styles.name, pressed && styles.pressed]}
        >
          {named}
        </Pressable>
      )}
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

interface AddChipProps {
  adding?: boolean;
  disabled: boolean;
  // A meal's when left out.
  name?: string;
  onAdd: () => void;
  // In the time bar's head: a solid outline of the head row's height (P04 ticket 45); else dashed, in the card's chips.
  inBar?: boolean;
  // What it reads: "＋ 같이" when left out, "같이 3 ›" with Friends in the Plan (P04 ticket 64).
  words?: string;
}

export function AddChip({
  adding = false,
  disabled,
  name = '같이 먹을 친구 추가',
  onAdd,
  inBar = false,
  words = '＋ 같이',
}: AddChipProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={name}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: adding }}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onAdd}
      style={pressedStyle([styles.chip, inBar ? styles.inBar : styles.add, adding && styles.adding])}
    >
      <Text style={[styles.label, adding && styles.personLabel]}>{words}</Text>
    </Pressable>
  );
}

// The origin chip picks the building to set out from; a time chip is handed on as it is.
function pressOf(chip: ConditionChip, on: Pick<ConditionChipsProps, 'onOrigin' | 'onUntil'>): () => void {
  return chip.kind === 'origin'
    ? on.onOrigin
    : (): void => {
        on.onUntil(chip);
      };
}

// The first row of the answer's card: the conditions the answer used, each a control that corrects it, then
// "＋ 같이", in lines that wrap so that no chip is cut, with the corner's action fixed at the right of the first line.
export function ConditionChips(props: ConditionChipsProps): ReactElement {
  const { chips, adding, disabled, corner, onProfile, friendIds, changed = null, addName, ...on } = props;
  const profileOf = (userId: string | null): (() => void) | null =>
    userId === null || onProfile === null || !friendIds.has(userId)
      ? null
      : (): void => {
          onProfile(userId);
        };
  return (
    <View style={styles.row} testID="condition-chips">
      <View style={styles.chips} testID="condition-chips-lines">
        {chips.map((chip) =>
          chip.kind === 'person' ? (
            <PersonChip
              chip={chip}
              disabled={disabled}
              key={`person-${chip.userId ?? chip.text}`}
              onProfile={profileOf(chip.userId)}
              onRemove={on.onRemove}
            />
          ) : (
            <ChipButton
              disabled={disabled || props.fixed === true}
              key={chip.kind}
              label={chip.text}
              marked={chip.mark !== undefined || chip === changed}
              onPress={pressOf(chip, on)}
            />
          ),
        )}
        {addName === null ? null : <AddChip adding={adding} disabled={disabled} name={addName} onAdd={on.onAdd} />}
        {props.extra}
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
    borderWidth: CHIP_BORDER,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  person: { borderColor: color.snuBlue, backgroundColor: color.blue50 },
  marked: { borderColor: color.quest, backgroundColor: color.questSoft },
  markedLabel: { color: color.quest },
  add: { borderStyle: 'dashed' },
  inBar: { height: BAR_ADD_HEIGHT },
  adding: { borderStyle: 'solid', borderColor: color.snuBlue, backgroundColor: color.blue100 },
  pressed: { opacity: 0.6 },
  label: { ...text.label, color: color.ink },
  personLabel: { color: color.snuBlue },
  name: { flexShrink: 1, alignSelf: 'stretch', justifyContent: 'center' },
  remove: { marginRight: -space[1], padding: 2, borderRadius: radius.full },
  corner: { flexDirection: 'row', alignItems: 'center', gap: 2, height: CHIP_HEIGHT },
  cornerLabel: { ...text.label, color: color.blue600 },
});
