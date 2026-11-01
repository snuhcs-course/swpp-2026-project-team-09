/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, cardStyles, color, font, Icon, type IconName, space } from '@/design-system';
import type { PostView } from '@/features/party/posts';
import { Faces, PhotoView } from './quest-photo';

export function openPost(questId: string): void {
  router.push(`/post/${questId}`);
}

// "참여하기", or "참여 신청" for an Approval Quest.
export function joinLabel(post: Pick<PostView, 'joinPolicy'>): string {
  return post.joinPolicy === 'approval' ? '참여 신청' : '참여하기';
}

// A line with its icon: the clock with the time, the pin with the place.
export function Line({ icon, children }: { icon: IconName; children: string }): ReactElement {
  return (
    <View style={styles.line}>
      <Icon color={color.inkMuted} name={icon} size={16} />
      <Text numberOfLines={1} style={styles.lineWords}>
        {children}
      </Text>
    </View>
  );
}

// "3/8명", in the 파티's colour.
export function Fill({ words }: { words: string }): ReactElement {
  return <Text style={styles.fill}>{words}</Text>;
}

// The Badges over a post: `파티`, and the Global Event's title.
export function PostBadges({ post, fill = true }: { post: PostView; fill?: boolean }): ReactElement {
  return (
    <View style={styles.top}>
      <View style={styles.badges}>
        <Badge tone="party">파티</Badge>
        {post.event === null ? null : <Badge tone="official">{post.event}</Badge>}
      </View>
      {fill ? <Fill words={post.fill} /> : null}
    </View>
  );
}

interface PostCardProps {
  post: PostView;
  onJoin: (post: PostView) => void;
  // `관심 없음`; left out, the card has no such button.
  onHide?: (post: PostView) => void;
  // Opens the post, from a press of the card or of `자세히 ›`. Left out, `자세히 ›` alone opens it with `openPost`.
  onOpen?: (post: PostView) => void;
  // What its owner adds under the time and the place.
  children?: ReactNode;
}

interface CardProps {
  post: PostView;
  onOpen: ((post: PostView) => void) | undefined;
  children: ReactNode;
}

// The card, which a press opens when its owner gives it `onOpen`, as 찾기 does. Its buttons stay buttons of their own:
// a press of one does not open the card. The card is not one control for a screen reader, and `자세히 ›` is the button
// that opens it.
function Card({ post, onOpen, children }: CardProps): ReactElement {
  const shared = { accessibilityLabel: post.title, style: [cardStyles.card, styles.card] };
  return onOpen === undefined ? (
    <View {...shared}>{children}</View>
  ) : (
    <Pressable
      {...shared}
      accessible={false}
      onPress={() => {
        onOpen(post);
      }}
      testID={`post-${post.questId}`}
    >
      {children}
    </Pressable>
  );
}

// A card of 찾기's 모집 중인 파티: its photo beside the title, the members' faces, `관심 없음` and `참여하기`.
export function PostCard({ post, onJoin, onHide, onOpen, children }: PostCardProps): ReactElement {
  return (
    <Card onOpen={onOpen} post={post}>
      <PostBadges post={post} />
      <View style={styles.head}>
        <View style={styles.headWords}>
          <Text style={styles.title}>{post.title}</Text>
          {post.description === '' ? null : (
            <Text numberOfLines={2} style={styles.description}>
              {post.description}
            </Text>
          )}
        </View>
        {post.photo === null ? null : <PhotoView photo={post.photo} size="thumb" />}
      </View>
      <View style={styles.lines}>
        <Line icon="clock">{post.time}</Line>
        <Line icon="pin">{post.place}</Line>
      </View>
      {children}
      <View style={styles.people}>
        <Faces faces={post.faces} />
        <Text numberOfLines={1} style={styles.members}>
          {post.members}
        </Text>
        <Pressable
          accessibilityLabel={`${post.title} 모집글 자세히 보기`}
          accessibilityRole="button"
          hitSlop={space[3]}
          onPress={() => {
            if (onOpen === undefined) {
              openPost(post.questId);
            } else {
              onOpen(post);
            }
          }}
        >
          <Text style={styles.more}>자세히 ›</Text>
        </Pressable>
      </View>
      <CardButtons onHide={onHide} onJoin={onJoin} post={post} />
    </Card>
  );
}

function CardButtons({ post, onJoin, onHide }: Omit<PostCardProps, 'onOpen' | 'children'>): ReactElement {
  return (
    <View style={styles.buttons}>
      {onHide === undefined ? null : (
        <Button
          label={`${post.title} 관심 없음`}
          onPress={() => {
            onHide(post);
          }}
          variant="ghost"
        >
          관심 없음
        </Button>
      )}
      <View style={styles.join}>
        <Button
          full
          onPress={() => {
            onJoin(post);
          }}
        >
          {joinLabel(post)}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 },
  fill: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.party },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  headWords: { flex: 1, gap: space[1] },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  join: { flex: 1 },
  title: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, letterSpacing: -0.18, color: color.ink },
  description: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  lines: { gap: space[1] },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lineWords: { flexShrink: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.inkMuted },
  people: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  members: { flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  more: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.blue600 },
});
