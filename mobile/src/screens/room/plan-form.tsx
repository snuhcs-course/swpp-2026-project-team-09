import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SubQuestContent } from '@/api/room-types';
import type { SubQuest } from '@/api/types';
import { Button, color, font, Icon, radius, space, TextField } from '@/design-system';
import { type PickedPlace, waitForPlace } from '@/features/places/picked-place';
import { usePlaceToSend } from '@/features/places/typed-place';
import { pointOf } from '@/features/quests/adapter';
import { DateTimeSheet, whenWords } from '../date-time-sheet';

interface PlanFormProps {
  // The Sub Quest edited, or null for a new one.
  editing: SubQuest | null;
  onCancel: () => void;
  // True once the main server took it, which closes the form.
  onSave: (content: SubQuestContent) => Promise<boolean>;
}

// The Sub Quest's place as if picked on the map. Words alone were typed, and are named again when sent.
function pickedOf(subQuest: SubQuest | null): PickedPlace | null {
  const place = subQuest?.place ?? null;
  const position = pointOf(place);
  return place === null || position === null ? null : { placeId: place.placeId, position, words: place.label };
}

// `언제`: a button with the time chosen, which closes the keyboard and opens the date·time sheet.
export function WhenField({
  startsAt,
  onPick,
}: {
  startsAt: string | null;
  onPick: (instant: string) => void;
}): ReactElement {
  const [picking, setPicking] = useState(false);
  const words = startsAt === null ? '날짜·시간 선택' : whenWords(startsAt);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>언제</Text>
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

interface WhereFieldProps {
  words: string;
  picked: PickedPlace | null;
  onWords: (words: string) => void;
  onPicked: (place: PickedPlace | null) => void;
}

// `어디서`: words of the User's own, and the map view, whose choice fills them. Emptied words drop the choice. Words
// without a choice are the Place they name, or else the words alone.
export function WhereField({ words, picked, onWords, onPicked }: WhereFieldProps): ReactElement {
  return (
    <View style={styles.where}>
      <View style={styles.whereField}>
        <TextField
          label="어디서"
          onChangeText={(next) => {
            onWords(next);
            if (next.trim() === '') {
              onPicked(null);
            }
          }}
          placeholder="직접 입력"
          value={words}
        />
      </View>
      <Pressable
        accessibilityLabel="지도에서 선택"
        accessibilityRole="button"
        onPress={() => {
          waitForPlace((place) => {
            onPicked(place);
            onWords(place.words);
          });
          router.push('/place-map');
        }}
        style={[styles.mapButton, picked !== null && styles.mapPicked]}
      >
        <Icon color={color.snuBlue} name="map" size={20} />
      </Pressable>
    </View>
  );
}

// The room's inline form for a Sub Quest, on a grey box: `내용`, `언제`, `어디서` with the map, `취소` and `추가` or
// `수정`, which waits for the content and the time.
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
      <WhereField onPicked={setPicked} onWords={setWords} picked={picked} words={words} />
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

const MAP_BUTTON = 50;

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
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: MAP_BUTTON,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  whenWords: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: color.ink },
  unset: { color: color.inkSubtle },
  where: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  whereField: { flex: 1 },
  mapButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: MAP_BUTTON,
    height: MAP_BUTTON,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  mapPicked: { borderWidth: 2, borderColor: color.snuBlue, backgroundColor: color.blue50 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[2] },
});
