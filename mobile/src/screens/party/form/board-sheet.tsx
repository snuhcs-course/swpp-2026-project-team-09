import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Board } from '@/api/types';
import { BottomSheet, color, font, Icon, RoundIcon, space } from '@/design-system';
import { BOARDS } from '@/features/party/boards';

interface BoardSheetProps {
  open: boolean;
  board: Board | null;
  onClose: () => void;
  onPick: (board: Board) => void;
}

// The sheet of the four boards, where a public post goes.
export function BoardSheet({ open, board, onClose, onPick }: BoardSheetProps): ReactElement {
  return (
    <BottomSheet label="게시판 고르기" onClose={onClose} open={open}>
      <View style={styles.body}>
        <View style={styles.head}>
          <Text accessibilityRole="header" style={styles.title}>
            게시판
          </Text>
          <Text style={styles.hint}>모집글이 올라갈 곳</Text>
        </View>
        <View accessibilityRole="radiogroup" style={styles.list}>
          {BOARDS.map(({ key, name, icon }) => {
            const chosen = key === board;
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
                <Text style={[styles.name, chosen && styles.chosen]}>{`${name} 게시판`}</Text>
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
  name: { flex: 1, fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: color.ink },
  chosen: { fontFamily: font.bold, color: color.snuBlue },
});
