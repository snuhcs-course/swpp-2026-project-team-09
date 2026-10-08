import type { ReactElement } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from './icon';
import { color, font, radius, space } from './tokens';

interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  // What a screen reader says, such as "친구 검색".
  label: string;
}

// A field that narrows a list: a search icon, the words, and ✕ "지우기" while it holds any.
export function SearchField({ value, onChangeText, placeholder, label }: SearchFieldProps): ReactElement {
  return (
    <View style={styles.field}>
      <Icon color={color.inkMuted} name="search" size={18} />
      <TextInput
        accessibilityLabel={label}
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.inkSubtle}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {value === '' ? null : (
        <Pressable
          accessibilityLabel="지우기"
          accessibilityRole="button"
          hitSlop={space[3]}
          onPress={() => {
            onChangeText('');
          }}
        >
          <Icon color={color.inkMuted} name="x" size={16} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: color.surfaceSubtle,
  },
  input: { flex: 1, minWidth: 0, padding: 0, fontFamily: font.regular, fontSize: 15, color: color.ink },
});
