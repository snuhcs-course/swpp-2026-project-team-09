/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, font, Icon, radius, space, TextField } from '@/design-system';
import {
  type ClassDraft,
  DAY_NAMES,
  EMPTY_SLOT,
  endNotAfterStart,
  MOST_SLOTS,
  placeText,
  type SlotDraft,
  slotCrossesAnother,
  slotName,
} from '@/features/timetable/class-form';
import { DayToggles, PlaceButton, TimeRow } from './class-fields';

// A dashed outline for `다른 시간대 추가`, as the frame draws it.
const ADD_LINE = '#C9CEDB';

// "월요일 수업", "월·수 수업", or "첫 수업": the first slot, as the `same` box names it.
function firstSlotWords(first: SlotDraft | undefined): string {
  const days = first?.days ?? [];
  const [only] = days;
  if (days.length === 1 && only !== undefined) {
    return `${DAY_NAMES[only] ?? ''}요일 수업`;
  }
  return days.length === 0
    ? '첫 수업'
    : `${days
        .toSorted((one, other) => one - other)
        .map((day) => DAY_NAMES[day] ?? '')
        .join('·')} 수업`;
}

// `월요일 수업과 같은 장소·강의실`: a slot after the first takes the first's Place and room, shown under it.
function SameBox({ draft, on, onToggle }: { draft: ClassDraft; on: boolean; onToggle: () => void }): ReactElement {
  const [first] = draft.slots;
  const words = `${firstSlotWords(first)}과 같은 장소·강의실`;
  let where = '첫 수업의 장소를 먼저 골라 주세요';
  if (first?.place !== null && first?.place !== undefined) {
    const room = first.room.trim();
    where = room === '' ? placeText(first.place) : `${placeText(first.place)} ${room}`;
  }
  return (
    <Pressable
      accessibilityLabel={words}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={onToggle}
      style={styles.same}
    >
      <View style={[styles.box, on && styles.boxOn]}>
        {on ? <Icon color={color.onPrimary} name="check" size={14} /> : null}
      </View>
      <View style={styles.sameWords}>
        <Text style={styles.sameLabel}>{words}</Text>
        {on ? (
          <Text numberOfLines={1} style={styles.sameWhere}>
            {where}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

interface SlotCardProps {
  draft: ClassDraft;
  index: number;
  onChange: (changed: Partial<SlotDraft>) => void;
  onRemove: () => void;
  onPickPlace: () => void;
}

// A slot's days and hours, with the error when the end is not after the start.
function SlotTimes({ draft, index, onChange }: Pick<SlotCardProps, 'draft' | 'index' | 'onChange'>): ReactElement {
  const slot = draft.slots[index] ?? EMPTY_SLOT;
  const endWrong = endNotAfterStart(slot);
  return (
    <>
      <DayToggles
        days={slot.days}
        onChange={(days) => {
          onChange({ days });
        }}
      />
      <TimeRow
        end={slot.end}
        endWrong={endWrong}
        onEnd={(end) => {
          onChange({ end });
        }}
        onStart={(start) => {
          onChange({ start });
        }}
        start={slot.start}
      />
      {endWrong ? (
        <Text accessibilityRole="alert" style={styles.error}>
          종료 시각이 시작 시각보다 늦어야 해요
        </Text>
      ) : null}
      {slotCrossesAnother(draft, index) ? (
        <Text accessibilityRole="alert" style={styles.error}>
          같은 요일의 다른 시간대와 시간이 겹쳐요
        </Text>
      ) : null}
    </>
  );
}

// A slot's Place and room; `prefix` starts their names when the form has several slots.
function SlotWhere({
  slot,
  prefix,
  onChange,
  onPickPlace,
}: {
  slot: SlotDraft;
  prefix: string;
  onChange: SlotCardProps['onChange'];
  onPickPlace: () => void;
}): ReactElement {
  return (
    <>
      <PlaceButton
        chosen={slot.place === null ? null : placeText(slot.place)}
        label={`${prefix}장소 선택`}
        onPress={onPickPlace}
      />
      <TextField
        accessibilityLabel={`${prefix}강의실 선택`}
        label="강의실 선택"
        maxLength={20}
        onChangeText={(room) => {
          onChange({ room });
        }}
        placeholder="예: 118호"
        value={slot.room}
      />
    </>
  );
}

// One time slot of the class form: its days, its hours, and its Place and room, or the first slot's. With several
// slots, each card is named by its days and hours, with `삭제`, and its controls' names start with it.
export function SlotCard({ draft, index, onChange, onRemove, onPickPlace }: SlotCardProps): ReactElement | null {
  const slot = draft.slots[index];
  if (slot === undefined) {
    return null;
  }
  const several = draft.slots.length > 1;
  const name = slotName(slot, index);
  const same = index > 0 && slot.same;
  return (
    <View accessibilityLabel={several ? name : undefined} style={styles.card}>
      {several ? (
        <View style={styles.head}>
          <Text style={styles.headName}>{name}</Text>
          <Pressable accessibilityLabel={`${name} 삭제`} accessibilityRole="button" hitSlop={8} onPress={onRemove}>
            <Text style={styles.remove}>삭제</Text>
          </Pressable>
        </View>
      ) : null}
      <SlotTimes draft={draft} index={index} onChange={onChange} />
      <View style={styles.rule} />
      {index > 0 ? (
        <SameBox
          draft={draft}
          on={same}
          onToggle={() => {
            onChange({ same: !same });
          }}
        />
      ) : null}
      {same ? null : (
        <SlotWhere onChange={onChange} onPickPlace={onPickPlace} prefix={several ? `${name} ` : ''} slot={slot} />
      )}
    </View>
  );
}

// `다른 시간대 추가`, while fewer than seven slots are there, and the hint under it while there is one.
export function AddSlot({ slots, onAdd }: { slots: number; onAdd: () => void }): ReactElement | null {
  if (slots >= MOST_SLOTS) {
    return null;
  }
  return (
    <View style={styles.adding}>
      <Pressable
        accessibilityRole="button"
        onPress={onAdd}
        style={({ pressed }): StyleProp<ViewStyle> => [styles.add, pressed && styles.addPressed]}
      >
        <Icon color={color.snuBlue} name="plus" size={18} />
        <Text style={styles.addWords}>다른 시간대 추가</Text>
      </Pressable>
      {slots === 1 ? <Text style={styles.hint}>요일마다 시간이나 강의실이 다르면 시간대를 추가하세요</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: space[2],
    borderBottomWidth: 1,
    borderBottomColor: color.surfaceSunken,
  },
  headName: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: color.ink },
  remove: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  error: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.danger },
  rule: { height: 1, marginVertical: space[1], backgroundColor: color.surfaceSunken },
  same: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  box: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: ADD_LINE,
    backgroundColor: color.surface,
  },
  boxOn: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
  sameWords: { flex: 1, minWidth: 0 },
  sameLabel: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.ink },
  sameWhere: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  adding: { gap: space[1] },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: ADD_LINE,
    backgroundColor: color.surface,
  },
  addPressed: { backgroundColor: color.blue50 },
  addWords: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.snuBlue },
  hint: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkFaint },
});
