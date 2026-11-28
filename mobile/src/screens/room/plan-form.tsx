/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, type ReactNode, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SubQuestContent } from '@/api/room-types';
import type { SubQuest } from '@/api/types';
import { Button, color, font, Icon, radius, space, TextField } from '@/design-system';
import type { PickedPlace } from '@/features/places/picked-place';
import { usePlaceToSend } from '@/features/places/typed-place';
import { pointOf } from '@/features/quests/adapter';
import { DateTimeSheet, whenWords } from '../date-time-sheet';
import { KindTag, usePlaceKind } from '../place-sheet/place-kind';
import { PlaceSheet } from '../place-sheet/place-sheet';
import { usePlaceSheet } from '../place-sheet/use-place-sheet';

interface PlanFormProps {
  // The Sub Quest edited, or null for a new one.
  editing: SubQuest | null;
  onCancel: () => void;
  // True once the main server took it, which closes the form.
  onSave: (content: SubQuestContent) => Promise<boolean>;
}

// The Sub Quest's place as if picked on the map. Words alone were typed, and are named again when sent.
export function pickedOf(subQuest: SubQuest | null): PickedPlace | null {
  const place = subQuest?.place ?? null;
  const position = pointOf(place);
  return place === null || position === null ? null : { placeId: place.placeId, position, words: place.label };
}

// `언제`: a button with the time chosen, which closes the keyboard and opens the date·time sheet. `icon` goes before
// the label, as the 파티 form marks its fields.
export function WhenField({
  startsAt,
  onPick,
  icon,
}: {
  startsAt: string | null;
  onPick: (instant: string) => void;
  icon?: ReactNode;
}): ReactElement {
  const [picking, setPicking] = useState(false);
  const words = startsAt === null ? '날짜·시간 선택' : whenWords(startsAt);
  return (
    <View style={styles.field}>
      {icon === undefined ? (
        <Text style={styles.label}>언제</Text>
      ) : (
        <View style={styles.labelRow}>
          {icon}
          <Text style={styles.label}>언제</Text>
        </View>
      )}
      <Pressable
        accessibilityLabel={`언제 ${words}`}
        accessibilityRole="button"
        onPress={() => {
          // The keyboard goes first, so that the sheet is never behind it.
          Keyboard.dismiss();
          setPicking(true);
        }}
        style={styles.when}
      >
        <Text style={[styles.whenWords, startsAt === null && styles.unset]}>{words}</Text>
        <Icon color={color.inkMuted} name="calendar" size={18} />
      </Pressable>
      <DateTimeSheet
        onClose={() => {
          setPicking(false);
        }}
        onPick={onPick}
        open={picking}
        value={startsAt}
      />
    </View>
  );
}

interface PlaceFieldProps {
  words: string;
  picked: PickedPlace | null;
  onSet: (words: string, picked: PickedPlace | null) => void;
}

// `어디서`: the place's words, or 장소 검색 in grey, with the grey tag of its kind, in a box like `언제`'s. A press
// opens the 파티 form's place sheet, which replaces the place but never removes it.
function PlaceField({ words, picked, onSet }: PlaceFieldProps): ReactElement {
  const kind = usePlaceKind(words, picked);
  const { open, sheet } = usePlaceSheet(words, onSet);
  const unset = words.trim() === '';
  const shown = unset ? '장소 검색' : words;
  return (
    <View style={styles.field} testID="place-row">
      <Text style={styles.label}>어디서</Text>
      <Pressable
        accessibilityLabel={`어디서 ${shown}`}
        accessibilityRole="button"
        onPress={() => {
          // The keyboard goes first, so that the sheet is never behind it.
          Keyboard.dismiss();
          open();
        }}
        style={[styles.when, styles.where]}
      >
        <Icon color={unset ? color.inkSubtle : color.inkMuted} name="pin" size={18} />
        <Text numberOfLines={1} style={[styles.whenWords, styles.whereWords, unset && styles.unset]}>
          {shown}
        </Text>
        {kind === null ? null : <KindTag kind={kind} />}
        <Icon color={color.inkSubtle} name="chevronRight" size={16} />
      </Pressable>
      <PlaceSheet sheet={sheet} />
    </View>
  );
}

// The room's inline form for a Sub Quest, on a grey box: `내용`, `언제`, `어디서` with the place sheet, `취소` and `추가`
// or `수정`, which waits for the content and the time.
export function PlanForm({ editing, onCancel, onSave }: PlanFormProps): ReactElement {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [startsAt, setStartsAt] = useState(editing?.startsAt ?? null);
  const [words, setWords] = useState(editing?.place?.label ?? '');
  const [picked, setPicked] = useState(() => pickedOf(editing));
  const [saving, setSaving] = useState(false);
  const placeToSend = usePlaceToSend();
  const save = (): void => {
    if (startsAt === null) {
      return;
    }
    setSaving(true);
    void placeToSend(words, picked)
      .then((place) => onSave({ title: title.trim(), startsAt, ...(place === undefined ? {} : { place }) }))
      .finally(() => {
        setSaving(false);
      });
  };
  return (
    <View style={styles.form}>
      <TextField label="내용" maxLength={30} onChangeText={setTitle} placeholder="301동 앞에서 만나기" value={title} />
      <WhenField onPick={setStartsAt} startsAt={startsAt} />
      <PlaceField
        onSet={(set, place) => {
          setWords(set);
          setPicked(place);
        }}
        picked={picked}
        words={words}
      />
      <View style={styles.buttons}>
        <Button onPress={onCancel} variant="secondary">
          취소
        </Button>
        <Button disabled={title.trim() === '' || startsAt === null || saving} onPress={save}>
          {editing === null ? '추가' : '수정'}
        </Button>
      </View>
    </View>
  );
}

const FIELD = 50;

const styles = StyleSheet.create({
  form: {
    gap: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    backgroundColor: color.surfaceSubtle,
  },
  field: { gap: space[1] },
  label: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.ink },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: FIELD,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  whenWords: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: color.ink },
  unset: { color: color.inkSubtle },
  // `언제`'s box, with the pin before the words and the tag and the chevron after them.
  where: { justifyContent: 'flex-start', gap: 10 },
  whereWords: { flex: 1, minWidth: 0 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[2] },
});
