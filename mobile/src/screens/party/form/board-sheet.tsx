/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Board } from '@/api/types';
import { BottomSheet, color, font, Icon, RoundIcon, SearchField, space } from '@/design-system';
import { BOARDS } from '@/features/party/boards';
import { useBoardRows } from '@/features/party/use-party';

interface BoardSheetProps {
  open: boolean;
  board: Board | null;
  onClose: () => void;
  onPick: (board: Board) => void;
}

function matches(name: string, search: string): boolean {
  const words = search.replaceAll(/\s/gu, '');
  return words === '' || `${name}게시판`.includes(words);
}

// The sheet of the four boards, where a public post goes: its search, and each board with `모집글 {n}`.
export function BoardSheet({ open, board, onClose, onPick }: BoardSheetProps): ReactElement {
  const [search, setSearch] = useState('');
  const rows = useBoardRows().data;
  const shown = BOARDS.filter(({ name }) => matches(name, search));
  return (
    <BottomSheet label="게시판 고르기" onClose={onClose} open={open}>
      <View style={styles.body}>
        <View style={styles.head}>
          <Text accessibilityRole="header" style={styles.title}>
            게시판
          </Text>
          <Text style={styles.hint}>모집글이 올라갈 곳</Text>
        </View>
        <SearchField label="게시판 검색" onChangeText={setSearch} placeholder="게시판 검색" value={search} />
        {shown.length === 0 ? <Text style={styles.none}>결과 없음</Text> : null}
        <View accessibilityRole="radiogroup" style={[styles.list, shown.length === 0 && styles.empty]}>
          {shown.map(({ key, name, icon }) => {
            const chosen = key === board;
            const count = rows?.find((row) => row.board === key)?.count;
            return (
              <Pressable
                accessibilityLabel={`${name} 게시판`}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen }}
                key={key}
                onPress={() => {
                  onPick(key);
                  onClose();
                }}
                style={styles.row}
              >
                <RoundIcon fill={color.blue50} icon={icon} ink={color.snuBlue} />
                <View style={styles.words}>
                  <Text style={[styles.name, chosen && styles.chosen]}>{`${name} 게시판`}</Text>
                  {count === undefined ? null : <Text style={styles.count}>{`모집글 ${String(count)}`}</Text>}
                </View>
                {chosen ? <Icon color={color.snuBlue} name="check" size={20} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: font.bold, fontSize: 18, lineHeight: 26, color: color.ink },
  hint: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  list: { borderWidth: 1, borderColor: color.border, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, paddingHorizontal: space[3] },
  empty: { borderWidth: 0 },
  none: {
    paddingVertical: space[3],
    textAlign: 'center',
    fontFamily: font.medium,
    fontSize: 14,
    color: color.inkMuted,
  },
  words: { flex: 1 },
  name: { fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: color.ink },
  count: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  chosen: { fontFamily: font.bold, color: color.snuBlue },
});
