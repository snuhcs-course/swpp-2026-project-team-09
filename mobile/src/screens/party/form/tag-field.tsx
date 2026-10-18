/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { myTagsQuery } from '@/api/queries';
import { Button, Chip, color, font, Icon, radius, space } from '@/design-system';
import { FieldHead } from './field-head';

const TAG_MOST = 30;

// A typed tag without its spaces and any '#'.
export function typedTag(words: string): string {
  return words.replaceAll(/[\s#]/gu, '').slice(0, TAG_MOST);
}

interface TagFieldProps {
  // The chosen tags, without '#'.
  tags: readonly string[];
  onChange: (tags: string[]) => void;
}

function TagInput({ onAdd }: { onAdd: (tag: string) => void }): ReactElement {
  const [words, setWords] = useState('');
  const tag = typedTag(words);
  const add = (): void => {
    if (tag !== '') {
      onAdd(tag);
      setWords('');
    }
  };
  return (
    <View style={styles.input}>
      <View style={styles.box}>
        <Text style={styles.hash}>#</Text>
        <TextInput
          accessibilityLabel="태그 직접 입력"
          autoFocus
          maxLength={TAG_MOST}
          onChangeText={setWords}
          onSubmitEditing={add}
          placeholder="태그"
          placeholderTextColor={color.inkSubtle}
          returnKeyType="done"
          style={styles.typed}
          submitBehavior="submit"
          value={words}
        />
      </View>
      <Button disabled={tag === ''} onPress={add}>
        추가
      </Button>
    </View>
  );
}

// `태그`: the User's own tags and those chosen, as chips that toggle, and `직접 입력` with `#`. The phone keeps them.
export function TagField({ tags, onChange }: TagFieldProps): ReactElement {
  const mine = useQuery(myTagsQuery).data ?? [];
  const [typing, setTyping] = useState(false);
  const offered = [...new Set([...mine, ...tags])];
  return (
    <View style={styles.field}>
      <FieldHead label="태그" />
      <View style={styles.chips}>
        {offered.map((tag) => {
          const on = tags.includes(tag);
          return (
            <Chip
              key={tag}
              onPress={() => {
                onChange(on ? tags.filter((one) => one !== tag) : [...tags, tag]);
              }}
              selected={on}
            >
              {`#${tag}`}
            </Chip>
          );
        })}
        <Pressable
          accessibilityLabel="직접 입력"
          accessibilityRole="button"
          accessibilityState={{ expanded: typing }}
          onPress={() => {
            setTyping(!typing);
          }}
          style={[styles.own, typing && styles.ownOn]}
        >
          <Icon color={typing ? color.snuBlue : color.inkMuted} name="plus" size={14} />
          <Text style={[styles.ownWords, typing && styles.ownWordsOn]}>직접 입력</Text>
        </Pressable>
      </View>
      {typing ? (
        <TagInput
          onAdd={(tag) => {
            if (!tags.includes(tag)) {
              onChange([...tags, tag]);
            }
          }}
        />
      ) : null}
    </View>
  );
}

const OWN = 36;
const BOX = 50;

const styles = StyleSheet.create({
  field: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  own: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: OWN,
    paddingHorizontal: space[3],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
    borderRadius: radius.full,
    backgroundColor: color.surface,
  },
  ownOn: { borderColor: color.snuBlue, backgroundColor: color.blue50 },
  ownWords: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  ownWordsOn: { color: color.snuBlue },
  input: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  box: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: BOX,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  hash: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 24, color: color.inkMuted },
  typed: { flex: 1, marginLeft: space[1], fontFamily: font.regular, fontSize: 16, color: color.ink },
});
