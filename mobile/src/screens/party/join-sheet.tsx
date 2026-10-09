/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet, Button, color, font, Icon, RoundIcon, space, text } from '@/design-system';
import type { PostView } from '@/features/party/posts';
import { joinLabel } from './post-card';

interface JoinSheetProps {
  post: PostView | null;
  onClose: () => void;
  onJoin: (post: PostView) => void;
}

function Row({ label, words }: { label: string; words: string }): ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowWords}>{words}</Text>
    </View>
  );
}

// The join confirm sheet, the frame's `PartyJoin`.
export function JoinSheet({ post, onClose, onJoin }: JoinSheetProps): ReactElement {
  return (
    <BottomSheet label="참여 확인" onClose={onClose} open={post !== null}>
      {post === null ? null : (
        <View style={styles.body}>
          <RoundIcon fill={color.partySoft} icon="users" ink={color.party} />
          <Text accessibilityRole="header" style={styles.title}>
            {`‘${post.title}’에 참여할까요?`}
          </Text>
          <View style={styles.rows}>
            <Row label="일정" words={post.time} />
            <Row label="장소" words={post.place} />
            <Row label="멤버" words={`${post.members} (${post.fill})`} />
          </View>
          <View style={styles.note}>
            <Icon color={color.inkMuted} name="info" size={16} />
            <Text style={styles.noteWords}>멤버가 파티를 활성화하면, 수락한 멤버끼리 위치를 공유해요.</Text>
          </View>
          <View style={styles.buttons}>
            <View style={styles.button}>
              <Button full onPress={onClose} size="lg" variant="secondary">
                취소
              </Button>
            </View>
            <View style={styles.button}>
              <Button
                full
                onPress={() => {
                  onClose();
                  onJoin(post);
                }}
                size="lg"
              >
                {joinLabel(post)}
              </Button>
            </View>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: space[5] },
  title: { ...text.title, color: color.ink },
  rows: { gap: space[2], padding: space[3], borderRadius: 12, backgroundColor: color.surfaceSubtle },
  row: { flexDirection: 'row', gap: space[3] },
  rowLabel: { width: 36, fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  rowWords: { flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.ink },
  note: { flexDirection: 'row', gap: 6 },
  noteWords: { flex: 1, ...text.caption, color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
  button: { flex: 1 },
});
