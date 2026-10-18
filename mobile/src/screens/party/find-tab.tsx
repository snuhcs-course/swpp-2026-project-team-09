/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompanionSeeker, OfficialRecruiting } from '@/api/quest-parts-types';
import {
  Avatar,
  Button,
  cardStyles,
  color,
  EmptyState,
  ErrorState,
  font,
  Icon,
  LoadingState,
  SearchField,
  space,
} from '@/design-system';
import type { PostView } from '@/features/party/posts';
import { useCompanionSeekers, useFindPosts, useOfficialRecruiting } from '@/features/party/use-party';
import { JoinSheet, officialSubject } from './join-sheet';
import { OfficialBanner } from './official-banner';
import { PostCard } from './post-card';
import { TagBadges } from './quest-photo';
import { useFindActions, usePartyActions } from './use-party-actions';

// What the join sheet asks about: a post, or official recruiting.
type Joining = { kind: 'post'; post: PostView } | { kind: 'official'; recruiting: OfficialRecruiting };

// 전체 파티 at its `공식` tab.
function openOfficialList(): void {
  router.push({ pathname: '/boards', params: { tab: 'official' } });
}

function SeekerCard({ seeker, onAsk }: { seeker: CompanionSeeker; onAsk: () => void }): ReactElement {
  return (
    <View accessibilityLabel={`${seeker.name} · ${seeker.department}`} style={[cardStyles.card, styles.seeker]}>
      <View style={styles.seekerHead}>
        <Avatar name={seeker.name} />
        <View style={styles.seekerWords}>
          <Text style={styles.seekerName}>{seeker.name}</Text>
          <Text style={styles.seekerDepartment}>{seeker.department}</Text>
        </View>
      </View>
      <Text style={styles.want}>{`“${seeker.want}”`}</Text>
      <TagBadges tags={seeker.tags} />
      <Text style={styles.free}>{`겹치는 빈 시간 · ${seeker.freeTogether}`}</Text>
      <Button disabled={seeker.asked} full icon="users" onPress={onAsk} variant="secondary">
        {seeker.asked ? '같이 하자고 했어요' : '같이 하자고 하기'}
      </Button>
    </View>
  );
}

// 같이 할 사람을 찾는 중: the people looking for company, side by side. Nothing when there are none, as in the build that
// asks the main server.
function Seekers(): ReactElement | null {
  const { data: seekers } = useCompanionSeekers();
  const actions = useFindActions();
  if (seekers === undefined || seekers.length === 0) {
    return null;
  }
  return (
    <View accessibilityLabel="같이 할 사람을 찾는 중" style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        같이 할 사람을 찾는 중
      </Text>
      <ScrollView contentContainerStyle={styles.seekers} horizontal showsHorizontalScrollIndicator={false}>
        {seekers.map((seeker) => (
          <SeekerCard key={seeker.id} onAsk={() => void actions.askSeeker(seeker)} seeker={seeker} />
        ))}
      </ScrollView>
    </View>
  );
}

// 모집 중인 파티's head, with `전체 보기` for 전체 파티.
function PostsHead(): ReactElement {
  return (
    <View style={styles.head}>
      <Text accessibilityRole="header" style={styles.heading}>
        모집 중인 파티
      </Text>
      <Pressable
        accessibilityLabel="전체 보기"
        accessibilityRole="button"
        hitSlop={space[3]}
        onPress={() => {
          router.push('/boards');
        }}
      >
        <Text style={styles.all}>전체 보기 ›</Text>
      </Pressable>
    </View>
  );
}

// 모집 중인 파티: the cards, and how many the User hid.
function Posts({ search, onJoin }: { search: string; onJoin: (post: PostView) => void }): ReactElement {
  const { data: found, isPending, refetch } = useFindPosts(search);
  const actions = useFindActions();
  return (
    <>
      {found === undefined && isPending ? <LoadingState /> : null}
      {found === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      {found?.posts.length === 0 ? <EmptyState words="결과 없음" /> : null}
      {(found?.posts ?? []).map((post) => (
        <PostCard key={post.questId} onHide={({ questId }) => void actions.hide(questId)} onJoin={onJoin} post={post} />
      ))}
      {found === undefined || found.hidden === 0 ? null : (
        <View style={styles.hidden}>
          <Icon color={color.inkMuted} name="check" size={14} />
          <Text style={styles.hiddenWords}>{`숨긴 파티 ${String(found.hidden)}개 · 다음 추천에 반영할게요`}</Text>
        </View>
      )}
    </>
  );
}

// The join sheets of 찾기: for a post, and for official recruiting.
function JoinSheets({ joining, onClose }: { joining: Joining | null; onClose: () => void }): ReactElement {
  const actions = usePartyActions();
  const findActions = useFindActions();
  return (
    <>
      <JoinSheet
        onClose={onClose}
        onJoin={(chosen) => void actions.join(chosen)}
        post={joining?.kind === 'post' ? joining.post : null}
      />
      <JoinSheet
        onClose={onClose}
        onJoin={() => {
          if (joining?.kind === 'official') {
            void findActions.joinOfficial(joining.recruiting);
          }
        }}
        post={joining?.kind === 'official' ? officialSubject(joining.recruiting) : null}
      />
    </>
  );
}

// 찾기: the banner of official recruiting, the search, 모집 중인 파티 ordered by the User's tags, and the people looking
// for company. The build that asks the main server has no official recruiting and no people looking for company.
export function FindTab(): ReactElement {
  const [search, setSearch] = useState('');
  const official = useOfficialRecruiting().data ?? [];
  const [joining, setJoining] = useState<Joining | null>(null);
  return (
    <>
      {official.length === 0 ? null : (
        <OfficialBanner
          onAll={openOfficialList}
          onOpen={(recruiting) => {
            setJoining({ kind: 'official', recruiting });
          }}
          recruiting={official}
        />
      )}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <SearchField label="파티 검색" onChangeText={setSearch} placeholder="파티 검색" value={search} />
        <PostsHead />
        <Posts
          onJoin={(post) => {
            setJoining({ kind: 'post', post });
          }}
          search={search}
        />
        <Seekers />
      </ScrollView>
      <JoinSheets
        joining={joining}
        onClose={() => {
          setJoining(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], padding: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[2] },
  heading: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, letterSpacing: -0.18, color: color.ink },
  all: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.blue600 },
  hidden: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hiddenWords: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  section: { gap: space[3], marginTop: space[2] },
  seekers: { gap: space[3] },
  seeker: { width: 240, gap: space[2] },
  seekerHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  seekerWords: { flex: 1 },
  seekerName: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  seekerDepartment: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  want: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.ink },
  free: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.party },
});
