/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { now } from '@/clock';
import { Avatar, color, font, Icon, type IconName, radius, space, text } from '@/design-system';
import { boardName } from '@/features/party/boards';
import type { PostView } from '@/features/party/posts';
import type { PostDetailView } from '@/features/party/use-party';
import { agoWords } from '@/features/quests/room-adapter';
import { Fill } from './post-card';
import { PostReasons } from './post-reasons';

// What 찾기's cards, 찾기's 모집글 sheet and the 모집글 screen show of a post. The stand-in photo and tags stay off
// them (P06 ticket 12).

// The board, small, and the fill at the other end: the top of a card and of the 모집글.
export function PostTop({ post }: { post: Pick<PostView, 'board' | 'fill'> }): ReactElement {
  return (
    <View style={styles.top}>
      {post.board === null ? null : (
        <View style={styles.board}>
          <Text style={styles.boardWords}>{boardName(post.board)}</Text>
        </View>
      )}
      <View style={styles.grow} />
      <Fill words={post.fill} />
    </View>
  );
}

interface InfoLineProps {
  icon: IconName;
  children: string;
  // The lines it may take before "…"; left out, as many as it needs.
  lines?: number;
  // The event of a 파티 for one, in blue. It opens nothing yet.
  event?: boolean;
  // A card's smaller, muted words, or the 모집글's.
  small?: boolean;
}

// A line after its icon: the time, the place, the members, or the event in blue.
export function InfoLine({ icon, children, lines, event = false, small = false }: InfoLineProps): ReactElement {
  const ink = event ? color.blue600 : small ? color.inkMuted : color.ink;
  return (
    <View style={styles.line} testID={event ? 'event-line' : undefined}>
      <View style={small ? styles.smallIcon : styles.icon}>
        <Icon color={event ? color.blue600 : color.inkMuted} name={icon} size={16} />
      </View>
      <Text numberOfLines={lines} style={[small ? styles.smallWords : styles.words, { color: ink }]}>
        {children}
      </Text>
    </View>
  );
}

// The 모집글: the board and the fill, the title, the Leader, a grey box with the time, the place, the members and the
// event, the description and 추천 이유.
export function PostContent({ post, reasons }: PostDetailView): ReactElement {
  return (
    <View style={styles.content}>
      <View style={styles.head}>
        <PostTop post={post} />
        <Text accessibilityRole="header" style={styles.title}>
          {post.title}
        </Text>
      </View>
      <View style={styles.host}>
        <Avatar name={post.leader.name} />
        <View style={styles.hostWords}>
          <Text style={styles.hostName}>{`${post.leader.name} · 모집자`}</Text>
          <Text style={styles.hostLine}>{`${post.leader.department} · ${agoWords(post.createdAt, now())}`}</Text>
        </View>
      </View>
      <View style={styles.box}>
        <InfoLine icon="clock">{post.time}</InfoLine>
        <InfoLine icon="pin">{post.place}</InfoLine>
        <InfoLine icon="users">{post.members}</InfoLine>
        {post.event === null ? null : (
          <InfoLine event icon="calendar">
            {post.event}
          </InfoLine>
        )}
      </View>
      {post.description === '' ? null : <Text style={styles.description}>{post.description}</Text>}
      {reasons === null ? null : <PostReasons reasons={reasons} />}
    </View>
  );
}

// The icon stands at the middle of the first line: 16 in a line of 20 on a card, of 22 in the 모집글.
const SMALL_DROP = 2;
const DROP = 3;
const BOARD_HEIGHT = 20;

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  grow: { flex: 1 },
  board: {
    justifyContent: 'center',
    height: BOARD_HEIGHT,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSubtle,
  },
  boardWords: { fontFamily: font.medium, fontSize: 11, lineHeight: 14, color: color.inkMuted },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  smallIcon: { paddingTop: SMALL_DROP },
  icon: { paddingTop: DROP },
  smallWords: { flexShrink: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  words: { flexShrink: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  content: { gap: space[4] },
  head: { gap: space[2] },
  title: { ...text.titleLg, color: color.ink },
  host: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  hostWords: { flex: 1, gap: 2 },
  hostName: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  hostLine: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  box: {
    gap: space[2],
    paddingVertical: 14,
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surfaceSubtle,
  },
  description: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.ink },
});
