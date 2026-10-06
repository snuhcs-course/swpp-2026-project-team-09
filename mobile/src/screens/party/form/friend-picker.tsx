import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Friend } from '@/api/types';
import { Avatar, Chip, color, font, Icon, radius, SearchField, space } from '@/design-system';
import { FieldHead } from './field-head';

interface FriendPickerProps {
  friends: readonly Friend[];
  chosen: readonly string[];
  // How many may be chosen.
  most: number;
  hint: string;
  onChosen: (ids: string[]) => void;
}

function matches({ name, department }: Friend, search: string): boolean {
  const words = search.replaceAll(/\s/gu, '');
  return words === '' || name.includes(words) || department.replaceAll(/\s/gu, '').includes(words);
}

interface FriendRowProps {
  friend: Friend;
  on: boolean;
  disabled: boolean;
  onPress: () => void;
}

function FriendRow({ friend, on, disabled, onPress }: FriendRowProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={friend.name}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, disabled && styles.off]}
    >
      <Avatar name={friend.name} size="sm" />
      <View style={styles.words}>
        <Text style={styles.name}>{friend.name}</Text>
        <Text style={styles.department}>{friend.department}</Text>
      </View>
      <View style={[styles.check, on && styles.checked]}>
        {on ? <Icon color={color.onPrimary} name="check" size={14} /> : null}
      </View>
    </Pressable>
  );
}

// `친구 초대`: the chosen Friends as chips, the search, and the list of Friends with a check.
export function FriendPicker({ friends, chosen, most, hint, onChosen }: FriendPickerProps): ReactElement {
  const [search, setSearch] = useState('');
  const full = chosen.length >= most;
  return (
    <View style={styles.field}>
      <FieldHead hint={hint} label="친구 초대" />
      {chosen.length === 0 ? null : (
        <View style={styles.chips}>
          {friends
            .filter(({ id }) => chosen.includes(id))
            .map(({ id, name }) => (
              <Chip
                key={id}
                onRemove={() => {
                  onChosen(chosen.filter((one) => one !== id));
                }}
                selected
              >
                {name}
              </Chip>
            ))}
        </View>
      )}
      <SearchField label="친구 검색" onChangeText={setSearch} placeholder="친구 검색" value={search} />
      <View style={styles.list}>
        {friends
          .filter((friend) => matches(friend, search))
          .map((friend) => {
            const on = chosen.includes(friend.id);
            return (
              <FriendRow
                disabled={!on && full}
                friend={friend}
                key={friend.id}
                on={on}
                onPress={() => {
                  onChosen(on ? chosen.filter((one) => one !== friend.id) : [...chosen, friend.id]);
                }}
              />
            );
          })}
      </View>
    </View>
  );
}

const CHECK = 22;

const styles = StyleSheet.create({
  field: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  list: { borderWidth: 1, borderColor: color.border, borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, paddingHorizontal: space[3] },
  off: { opacity: 0.4 },
  words: { flex: 1 },
  name: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  department: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CHECK,
    height: CHECK,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    borderRadius: radius.full,
  },
  checked: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
});
