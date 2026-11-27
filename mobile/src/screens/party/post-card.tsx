/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, cardStyles, color, font, Icon, type IconName, space } from '@/design-system';
import type { PostView } from '@/features/party/posts';
import { Faces } from './quest-photo';

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

// "오늘 19:30 · 버들골 입구" on one line: the clock with the time, the pin with the place, which "…" cuts when long.
function WhenWhere({ post }: { post: PostView }): ReactElement {
  return (
    <View style={styles.whenWhere}>
      <Icon color={color.inkMuted} name="clock" size={16} />
      <Text style={styles.when}>{post.time}</Text>
      <Text style={styles.dot}>·</Text>
      <Icon color={color.inkMuted} name="pin" size={16} />
      <Text numberOfLines={1} style={styles.where}>
        {post.place}
      </Text>
    </View>
  );
}

interface PostCardProps {
  post: PostView;
  onJoin: (post: PostView) => void;
  // `관심 없음`; left out, the card has no such button.
  onHide?: (post: PostView) => void;
  // `신청 취소`, in place of `참여 신청` once the User's request waits. Left out, the card shows `참여 신청` still.
  onWithdraw?: (post: PostView, requestId: string) => void;
  // Opens the post, from a press of the card or of its title. Left out, the title alone opens it with `openPost`.
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
// a press of one does not open the card. The card is not one control for a screen reader, and its title is the button
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

// A card of 찾기's 모집 중인 파티: the Global Event's badge when there is one, the title over "when · where", the
// members' faces with "3/8명" at the end, `관심 없음` and `참여하기`.
export function PostCard({ post, onJoin, onHide, onWithdraw, onOpen, children }: PostCardProps): ReactElement {
  const open = (): void => {
    if (onOpen === undefined) {
      openPost(post.questId);
    } else {
      onOpen(post);
    }
  };
  return (
    <Card onOpen={onOpen} post={post}>
      {post.event === null ? null : (
        <View style={styles.badges}>
          <Badge tone="official">{post.event}</Badge>
        </View>
      )}
      <View style={styles.head}>
        <View style={styles.headWords}>
          <Text
            accessibilityLabel={`${post.title} 모집글 자세히 보기`}
            accessibilityRole="button"
            onPress={open}
            style={styles.title}
          >
            {post.title}
          </Text>
          <WhenWhere post={post} />
        </View>
      </View>
      {children}
      <View style={styles.people}>
        <Faces faces={post.faces} />
        <Text numberOfLines={1} style={styles.members}>
          {post.members}
        </Text>
        <Fill words={post.fill} />
      </View>
      <CardButtons onHide={onHide} onJoin={onJoin} onWithdraw={onWithdraw} post={post} />
    </Card>
  );
}

// The request of the User's that waits on the post, or null.
function waitingRequest({ role }: PostView): string | null {
  return role.kind === 'approval' ? role.requestId : null;
}

function CardButtons({ post, onJoin, onHide, onWithdraw }: Omit<PostCardProps, 'onOpen' | 'children'>): ReactElement {
  const requestId = onWithdraw === undefined ? null : waitingRequest(post);
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
        {requestId === null ? (
          <Button
            full
            onPress={() => {
              onJoin(post);
            }}
          >
            {joinLabel(post)}
          </Button>
        ) : (
          <Button
            full
            label={`${post.title} 신청 취소`}
            onPress={() => {
              onWithdraw?.(post, requestId);
            }}
            variant="secondary"
          >
            신청 취소
          </Button>
        )}
      </View>
    </View>
  );
}

// The frame's measures: the card's padding, 12 over and 14 under.
const PAD_TOP = 12;
const PAD_BOTTOM = 14;

const styles = StyleSheet.create({
  card: { gap: 10, paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fill: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.party },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  headWords: { flex: 1, minWidth: 0, gap: space[1] },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  join: { flex: 1 },
  title: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, letterSpacing: -0.18, color: color.ink },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  whenWhere: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lineWords: { flexShrink: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.inkMuted },
  when: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  dot: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkSubtle },
  where: { flexShrink: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  people: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  members: {
    flex: 1,
    marginLeft: space[1],
    fontFamily: font.medium,
    fontSize: 12,
    lineHeight: 16,
    color: color.inkMuted,
  },
});
