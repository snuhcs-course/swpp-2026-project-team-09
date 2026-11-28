/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from './icon';
import { TextEntry } from './text-entry';
import { color, font, radius, space, text } from './tokens';

interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  // What a screen reader says, such as "친구 검색".
  label: string;
  // What a screen reader says for ✕: "지우기" unless given.
  clearLabel?: string;
  // The field takes the focus when it appears, so that the keyboard rises at once: a search opened by a press.
  autoFocus?: boolean;
  // 'bare' for a tab's header search (the user's choice, 2026-11-28): no box, the words in the title's place on the
  // header's white, and no ✕ of its own, as the header's one ✕ closes the search.
  variant?: 'filled' | 'bare';
}

// What a list narrowed by a search says when nothing is left.
export const NO_RESULTS = '결과 없음';

// A field that narrows a list: a search icon, the words, and ✕ "지우기" while it holds any. Every search box of the app
// is one, and a list it narrows on the phone matches its words with `matchesWords`.
export function SearchField({
  value,
  onChangeText,
  placeholder,
  label,
  clearLabel = '지우기',
  autoFocus = false,
  variant = 'filled',
}: SearchFieldProps): ReactElement {
  const bare = variant === 'bare';
  return (
    <View style={bare ? styles.bare : styles.field} testID={bare ? 'header-search' : undefined}>
      <Icon color={color.inkMuted} name="search" size={bare ? 20 : 18} />
      <TextEntry
        accessibilityLabel={label}
        autoFocus={autoFocus}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.inkSubtle}
        returnKeyType="search"
        style={[styles.input, bare && styles.bareInput]}
        value={value}
      />
      {bare || value === '' ? null : (
        <Pressable
          accessibilityLabel={clearLabel}
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
  bare: { flexDirection: 'row', alignItems: 'center', gap: space[2], height: 44 },
  input: { flex: 1, minWidth: 0, padding: 0, fontFamily: font.regular, fontSize: 15, color: color.ink },
  // The type nearest the title's place that still reads as typing: 18 SemiBold.
  bareInput: { ...text.title, color: color.ink },
});
