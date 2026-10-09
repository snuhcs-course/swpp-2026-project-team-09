/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip, color, font, Icon, radius, space, TextField } from '@/design-system';
import { boardName } from '@/features/party/boards';
import { MAX_CAPACITY, MIN_CAPACITY, type PartyForm, type Visibility } from '@/features/party/making';
import { BoardSheet } from './board-sheet';
import { FieldHead } from './field-head';

type Change = (change: Partial<PartyForm>) => void;

const DESCRIPTION_MOST = 200;

export function DescriptionField({ form, onChange }: { form: PartyForm; onChange: Change }): ReactElement {
  return (
    <TextField
      helper={`${String(form.description.length)}/${String(DESCRIPTION_MOST)}`}
      label="본문"
      maxLength={DESCRIPTION_MOST}
      multiline
      onChangeText={(description) => {
        onChange({ description });
      }}
      placeholder="내용"
      value={form.description}
    />
  );
}

function StepButton({ icon, label, onPress, disabled }: StepButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.step, disabled && styles.stepOff]}
    >
      <Icon color={disabled ? color.inkSubtle : color.snuBlue} name={icon} size={20} />
    </Pressable>
  );
}

interface StepButtonProps {
  icon: 'minus' | 'plus';
  label: string;
  onPress: () => void;
  disabled: boolean;
}

// `인원`: a stepper from 2 to 8.
export function CapacityField({ form, onChange }: { form: PartyForm; onChange: Change }): ReactElement {
  const { capacity } = form;
  return (
    <View style={styles.field}>
      <FieldHead label="인원" />
      <View style={styles.stepper}>
        <StepButton
          disabled={capacity <= MIN_CAPACITY}
          icon="minus"
          label="인원 줄이기"
          onPress={() => {
            onChange({ capacity: capacity - 1 });
          }}
        />
        <Text style={styles.count}>{`${String(capacity)}명`}</Text>
        <StepButton
          disabled={capacity >= MAX_CAPACITY}
          icon="plus"
          label="인원 늘리기"
          onPress={() => {
            onChange({ capacity: capacity + 1 });
          }}
        />
      </View>
    </View>
  );
}

const VISIBILITY: readonly { key: Visibility; label: string; icon: 'users' | 'lock' }[] = [
  { key: 'public', label: '공개', icon: 'users' },
  { key: 'private', label: '비공개', icon: 'lock' },
];

// `공개 범위`, and under 공개 the Join Policy's chips.
export function VisibilityField({ form, onChange }: { form: PartyForm; onChange: Change }): ReactElement {
  const open = form.visibility === 'public';
  return (
    <View style={styles.field}>
      <FieldHead hint={open ? '찾기에 올라가요' : '초대한 친구만 볼 수 있어요'} label="공개 범위" />
      <View accessibilityRole="radiogroup" style={styles.radios}>
        {VISIBILITY.map(({ key, label, icon }) => {
          const on = form.visibility === key;
          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              key={key}
              onPress={() => {
                onChange({ visibility: key });
              }}
              style={[styles.radio, on && styles.radioOn]}
            >
              <Icon color={on ? color.snuBlue : color.inkMuted} name={icon} size={18} />
              <Text style={[styles.radioWords, on && styles.radioWordsOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {open ? (
        <View style={styles.chips}>
          <Chip
            onPress={() => {
              onChange({ policy: 'open' });
            }}
            selected={form.policy === 'open'}
          >
            바로 참여
          </Chip>
          <Chip
            onPress={() => {
              onChange({ policy: 'approval' });
            }}
            selected={form.policy === 'approval'}
          >
            승인 후 참여
          </Chip>
        </View>
      ) : null}
    </View>
  );
}

// `게시판`: the button that opens the sheet of boards.
export function BoardField({ form, onChange }: { form: PartyForm; onChange: Change }): ReactElement {
  const [picking, setPicking] = useState(false);
  const words = form.board === null ? '게시판 선택' : boardName(form.board);
  return (
    <View style={styles.field}>
      <FieldHead hint="모집글이 올라갈 곳" label="게시판" />
      <Pressable
        accessibilityLabel={`게시판 ${words}`}
        accessibilityRole="button"
        onPress={() => {
          setPicking(true);
        }}
        style={styles.picker}
      >
        <Text style={[styles.pickerWords, form.board === null && styles.unset]}>{words}</Text>
        <Icon color={color.inkMuted} name="chevronDown" size={18} />
      </Pressable>
      <BoardSheet
        board={form.board}
        onClose={() => {
          setPicking(false);
        }}
        onPick={(board) => {
          onChange({ board });
        }}
        open={picking}
      />
    </View>
  );
}

const HEIGHT = 50;

const styles = StyleSheet.create({
  field: { gap: space[2] },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  step: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.full,
  },
  stepOff: { backgroundColor: color.surfaceSubtle },
  count: { minWidth: 48, textAlign: 'center', fontFamily: font.bold, fontSize: 18, lineHeight: 26, color: color.ink },
  radios: { flexDirection: 'row', gap: space[2] },
  radio: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  radioOn: { borderWidth: 2, borderColor: color.snuBlue, backgroundColor: color.blue50 },
  radioWords: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: color.inkMuted },
  radioWordsOn: { fontFamily: font.bold, color: color.snuBlue },
  chips: { flexDirection: 'row', gap: space[2] },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: HEIGHT,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  pickerWords: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 24, color: color.ink },
  unset: { fontFamily: font.regular, color: color.inkSubtle },
});
