// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, BottomSheet, Button, color, Dialog, space, text } from '@/design-system';
import type { FriendView } from '@/features/friends/adapter';

function Sheet({ friend, onEnd }: { friend: FriendView; onEnd: () => void }): ReactElement {
  return (
    <View style={styles.sheet}>
      <View style={styles.head}>
        <Avatar name={friend.name} source={friend.photo === null ? undefined : { uri: friend.photo }} />
        <View style={styles.words}>
          <Text accessibilityRole="header" style={styles.name}>
            {friend.name}
          </Text>
          <Text style={styles.department}>{friend.department}</Text>
        </View>
      </View>
      <Button full onPress={onEnd} size="lg" variant="danger">
        친구 끊기
      </Button>
    </View>
  );
}

interface EndFriendshipProps {
  // The Friend whose row was pressed, or null.
  friend: FriendView | null;
  onClose: () => void;
  onEnd: (friend: FriendView) => void;
}

// The sheet of a pressed Friend, with 친구 끊기, and the danger dialog that confirms it.
export function EndFriendship({ friend, onClose, onEnd }: EndFriendshipProps): ReactElement {
  // The Friend is kept while the sheet slides away and the dialog asks.
  const [shown, setShown] = useState<FriendView | null>(friend);
  const [asking, setAsking] = useState<FriendView | null>(null);
  if (friend !== null && friend !== shown) {
    setShown(friend);
  }
  return (
    <>
      <BottomSheet label={shown?.name ?? '친구'} onClose={onClose} open={friend !== null}>
        {shown === null ? null : (
          <Sheet
            friend={shown}
            onEnd={() => {
              setAsking(shown);
              onClose();
            }}
          />
        )}
      </BottomSheet>
      <Dialog
        body="서로 위치가 보이지 않고, 답을 기다리는 파티 초대도 취소돼요."
        cancelLabel="취소"
        confirmLabel="끊기"
        onCancel={() => {
          setAsking(null);
        }}
        onConfirm={() => {
          if (asking !== null) {
            onEnd(asking);
          }
          setAsking(null);
        }}
        title={`${asking?.name ?? ''}님과 친구를 끊을까요?`}
        tone="danger"
        visible={asking !== null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: space[4], paddingHorizontal: space[5], paddingTop: space[2] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  words: { flex: 1, gap: 2 },
  name: { ...text.title, color: color.ink },
  department: { ...text.body, color: color.inkMuted },
});
