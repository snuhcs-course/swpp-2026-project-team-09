/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { OfficialRecruiting } from '@/api/quest-parts-types';
import type { JoinPolicy } from '@/api/types';
import { BottomSheet, Button, color, font, Icon, RoundIcon, space, text } from '@/design-system';
import { joinLabel } from './post-card';

// What the sheet asks the User to join: a post, or official recruiting.
export interface JoinSubject {
  title: string;
  time: string;
  place: string;
  members: string;
  fill: string;
  joinPolicy: JoinPolicy;
}

// Official recruiting as the sheet asks about it: its host in place of its members.
export function officialSubject(recruiting: OfficialRecruiting): JoinSubject {
  return {
    title: recruiting.title.replaceAll('\n', ' '),
    time: recruiting.time,
    place: recruiting.place,
    members: recruiting.host,
    fill: recruiting.fill,
    joinPolicy: 'open',
  };
}

interface JoinSheetProps<Subject extends JoinSubject> {
  post: Subject | null;
  onClose: () => void;
  onJoin: (post: Subject) => void;
}

function Row({ label, words }: { label: string; words: string }): ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowWords}>{words}</Text>
    </View>
  );
}

// The join confirm sheet, the frame's `PartyJoin`. Its note says that any member may switch the Party on, as the
// app has it (P06 spec, Rules), where the frame says the 파티장.
export function JoinSheet<Subject extends JoinSubject>({
  post,
  onClose,
  onJoin,
}: JoinSheetProps<Subject>): ReactElement {
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
