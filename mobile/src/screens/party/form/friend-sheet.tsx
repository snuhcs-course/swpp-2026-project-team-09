/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Friend } from '@/api/types';
import { BottomSheet, Button, color, font, radius, SearchField, space } from '@/design-system';
import { FriendRow, matchesFriend } from './friend-picker';

interface FriendSheetProps {
  open: boolean;
  friends: readonly Friend[];
  chosen: readonly string[];
  // How many may be chosen: the free places.
  most: number;
  onClose: () => void;
  onChosen: (ids: string[]) => void;
}

interface ListProps {
  friends: readonly Friend[];
  search: string;
  checked: readonly string[];
  most: number;
  onChecked: (ids: readonly string[]) => void;
}

// The Friends the search finds, each with its check; none more once the free places are taken.
function FriendList({ friends, search, checked, most, onChecked }: ListProps): ReactElement {
  const full = checked.length >= most;
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
      <View style={styles.list}>
        {friends
          .filter((friend) => matchesFriend(friend, search))
          .map((friend) => {
            const on = checked.includes(friend.id);
            return (
              <FriendRow
                disabled={!on && full}
                friend={friend}
                key={friend.id}
                on={on}
                onPress={() => {
                  onChecked(on ? checked.filter((one) => one !== friend.id) : [...checked, friend.id]);
                }}
              />
            );
          })}
      </View>
    </ScrollView>
  );
}

// 친구 초대, the 파티 form's sheet: the search, the list of Friends with a check, how many places are left, and 'n명
// 초대', which keeps the Friends checked. Closed another way, it keeps the ones chosen before.
export function FriendSheet({ open, friends, chosen, most, onClose, onChosen }: FriendSheetProps): ReactElement {
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<readonly string[]>(chosen);
  // Each opening starts from the Friends chosen so far.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setChecked(chosen);
      setSearch('');
    }
  }
  return (
    <BottomSheet label="친구 초대" onClose={onClose} open={open}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          친구 초대
        </Text>
        <SearchField label="친구 검색" onChangeText={setSearch} placeholder="친구 검색" value={search} />
        <FriendList checked={checked} friends={friends} most={most} onChecked={setChecked} search={search} />
        <Text style={styles.left}>{`남은 자리 ${String(most)}명까지 초대할 수 있어요`}</Text>
        <Button
          full
          onPress={() => {
            onChosen([...checked]);
            onClose();
          }}
          size="lg"
        >
          {checked.length === 0 ? '완료' : `${String(checked.length)}명 초대`}
        </Button>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, gap: space[3], paddingHorizontal: space[4] },
  title: { fontFamily: font.bold, fontSize: 18, lineHeight: 26, color: color.ink },
  scroll: { flexShrink: 1 },
  list: { overflow: 'hidden', borderWidth: 1, borderColor: color.border, borderRadius: radius.md },
  left: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.inkMuted },
});
