import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  color,
  ErrorState,
  font,
  FullScreenPanel,
  Icon,
  LoadingState,
  radius,
  RoundIcon,
  space,
} from '@/design-system';
import { BOARDS } from '@/features/party/boards';
import { useBoardRows } from '@/features/party/use-party';

// 전체 파티: the four boards, each with its count of posts and `N` when a post was made today.
export function BoardsScreen(): ReactElement {
  const { data: rows, isPending, refetch } = useBoardRows();
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} subtle title="전체 파티">
      {rows === undefined && isPending ? <LoadingState /> : null}
      {rows === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      {rows === undefined ? null : (
        <View accessibilityLabel="게시판" style={styles.list}>
          {rows.map(({ board, name, count, fresh }) => (
            <Pressable
              accessibilityLabel={`${name} · 모집글 ${String(count)}개`}
              accessibilityRole="button"
              key={board}
              onPress={() => {
                router.push(`/boards/${board}`);
              }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <RoundIcon
                fill={color.blue50}
                icon={BOARDS.find(({ key }) => key === board)?.icon ?? 'info'}
                ink={color.snuBlue}
              />
              <Text style={styles.name}>{name}</Text>
              {fresh ? (
                <View style={styles.fresh}>
                  <Text style={styles.freshWords}>N</Text>
                </View>
              ) : null}
              <Text style={styles.count}>{count}</Text>
              <Icon color={color.inkSubtle} name="chevronRight" size={18} />
            </Pressable>
          ))}
        </View>
      )}
    </FullScreenPanel>
  );
}

const MARK = 18;

const styles = StyleSheet.create({
  list: {
    marginTop: space[3],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 64,
    paddingHorizontal: space[4],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  pressed: { backgroundColor: color.surfaceSubtle },
  name: { flex: 1, fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  fresh: {
    alignItems: 'center',
    justifyContent: 'center',
    width: MARK,
    height: MARK,
    borderRadius: radius.full,
    backgroundColor: color.danger,
  },
  freshWords: { fontFamily: font.bold, fontSize: 10, lineHeight: 12, color: color.onPrimary },
  count: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.inkMuted },
});
