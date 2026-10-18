/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { color, font, radius, space, text } from '@/design-system';
import { NAME_LENGTH } from '@/features/timetable/versions';

const HEIGHT = 32;

// The current version's row while it is renamed, as the `Profile` frame draws it: a field of at most 20 characters and
// 확인. Enter or 확인 gives the name; Escape gives null, and the old name stays.
export function Rename({ name, onDone }: { name: string; onDone: (name: string | null) => void }): ReactElement {
  const [draft, setDraft] = useState(name);
  return (
    <View style={styles.row}>
      <TextInput
        accessibilityLabel="시간표 이름"
        autoFocus
        maxLength={NAME_LENGTH}
        onChangeText={setDraft}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Escape') {
            onDone(null);
          }
        }}
        onSubmitEditing={() => {
          onDone(draft);
        }}
        returnKeyType="done"
        selectTextOnFocus
        style={styles.input}
        value={draft}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onDone(draft);
        }}
        style={styles.save}
      >
        <Text style={styles.saveWords}>확인</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: space[1],
    paddingLeft: space[3],
    paddingRight: space[2],
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: HEIGHT,
    paddingVertical: 0,
    paddingHorizontal: space[2],
    borderWidth: 1,
    borderColor: color.snuBlue,
    borderRadius: radius.sm + 2,
    fontFamily: font.medium,
    fontSize: 14,
    color: color.ink,
  },
  save: {
    height: HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: radius.sm + 2,
    backgroundColor: color.snuBlue,
  },
  saveWords: { ...text.caption, fontFamily: font.semiBold, color: color.onPrimary },
});
