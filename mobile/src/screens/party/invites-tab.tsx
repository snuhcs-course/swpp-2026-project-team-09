/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ShownQuestInvitation } from '@/api/quest-parts-types';
import type { MyJoinRequest } from '@/api/waiting-types';
import { now } from '@/clock';
import {
  Avatar,
  Button,
  cardStyles,
  color,
  EmptyState,
  ErrorState,
  font,
  LoadingState,
  space,
  text,
} from '@/design-system';
import { whenOf } from '@/features/party/posts';
import { useInvitations, useSentRequests } from '@/features/party/use-party';
import { agoWords } from '@/features/quests/room-adapter';
import { type Ask, ConfirmSheet } from '../room/confirm-sheet';
import { openPost } from './post-card';
import { type PartyActions, showFind, usePartyActions } from './use-party-actions';

// `{when} · {where} · {names} 함께`, of what the invitation carries: the server build has none of the three yet, and
// then the card counts the Holders.
function metaOf({ quest, startsAt, place }: ShownQuestInvitation): string {
  const companions = quest.faces.slice(1).map(({ name }) => name);
  const parts = [
    ...(startsAt === null ? [] : [whenOf(startsAt)]),
    ...(place === null ? [] : [place]),
    ...(companions.length === 0 ? [] : [`${companions.join(', ')} 함께`]),
  ];
  return parts.length === 0 ? `${quest.holderCount}명 참여 중` : parts.join(' · ');
}

function InvitationCard({
  invitation,
  actions,
}: {
  invitation: ShownQuestInvitation;
  actions: PartyActions;
}): ReactElement {
  const { quest, sentAt } = invitation;
  const kind = quest.joinPolicy === 'closed' ? '비공개 파티에' : '파티에';
  return (
    <View accessibilityLabel={quest.title} style={[cardStyles.card, styles.card]}>
      <View style={styles.from}>
        <Avatar name={quest.leader.name} size="sm" />
        <Text numberOfLines={1} style={styles.fromWords}>{`${quest.leader.name}님이 ${kind} 초대했어요`}</Text>
        <Text style={styles.ago}>{agoWords(sentAt, now())}</Text>
      </View>
      <Text style={styles.title}>{quest.title}</Text>
      {quest.description === '' ? null : (
        <Text numberOfLines={2} style={styles.description}>
          {quest.description}
        </Text>
      )}
      <Text style={styles.meta}>{metaOf(invitation)}</Text>
      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button full onPress={() => void actions.decline(invitation)} variant="secondary">
            거절
          </Button>
        </View>
        <View style={styles.button}>
          <Button full onPress={() => void actions.accept(invitation)}>
            수락
          </Button>
        </View>
      </View>
    </View>
  );
}

// A request the User sent: a press of its title opens the post, and `신청 취소` asks before withdrawing.
function SentRequestRow({ request, onWithdraw }: { request: MyJoinRequest; onWithdraw: () => void }): ReactElement {
  const { quest, sentAt } = request;
  return (
    <View style={[cardStyles.card, styles.sent]} testID={`sent-request-${request.id}`}>
      <Pressable
        accessibilityLabel={quest.title}
        accessibilityRole="button"
        onPress={() => {
          openPost(quest.id);
        }}
        style={styles.sentWords}
      >
        <Text numberOfLines={1} style={styles.sentTitle}>
          {quest.title}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>{`${quest.leader.name} · ${agoWords(sentAt, now())} 신청`}</Text>
      </Pressable>
      <Button onPress={onWithdraw} variant="secondary">
        신청 취소
      </Button>
    </View>
  );
}

function withdrawAsk({ id, quest }: MyJoinRequest, actions: PartyActions): Ask {
  return {
    title: `‘${quest.title}’ 참여 신청을 취소할까요?`,
    body: '파티장에게 보낸 신청이 사라져요.',
    confirm: '신청 취소',
    danger: true,
    onConfirm: () => void actions.withdraw(id, quest.id),
  };
}

// `보낸 신청`: the User's waiting requests to join, the newest first, beside the invitations received.
function SentRequests({ actions }: { actions: PartyActions }): ReactElement {
  const { data: requests, isPending, refetch } = useSentRequests();
  const [ask, setAsk] = useState<Ask | null>(null);
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {requests === undefined ? '보낸 신청' : `보낸 신청 · ${requests.length}`}
      </Text>
      {requests === undefined && isPending ? <LoadingState /> : null}
      {requests === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      {requests?.length === 0 ? (
        <EmptyState
          action={{ label: '파티 찾기', onPress: showFind }}
          icon="users"
          words="여기서는 보낸 참여 신청을 볼 수 있어요"
        />
      ) : null}
      {(requests ?? []).map((request) => (
        <SentRequestRow
          key={request.id}
          onWithdraw={() => {
            setAsk(withdrawAsk(request, actions));
          }}
          request={request}
        />
      ))}
      <ConfirmSheet
        ask={ask}
        label="확인"
        onClose={() => {
          setAsk(null);
        }}
      />
    </View>
  );
}

// 초대, the frame's `PartyInvites`: the invitations into Quests under `받은 초대`, then the User's own requests to join
// under `보낸 신청`, each the newest first.
export function InvitesTab(): ReactElement {
  const { data: invitations, isPending, refetch } = useInvitations();
  const actions = usePartyActions();
  if (invitations === undefined) {
    return isPending ? <LoadingState /> : <ErrorState onRetry={refetch} />;
  }
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {`받은 초대 · ${invitations.length}`}
        </Text>
        {invitations.length === 0 ? <EmptyState icon="users" words="받은 초대가 없어요" /> : null}
        {invitations.map((invitation) => (
          <InvitationCard actions={actions} invitation={invitation} key={invitation.id} />
        ))}
      </View>
      <SentRequests actions={actions} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[6], padding: space[4], paddingBottom: space[6] },
  section: { gap: space[3] },
  sectionTitle: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  card: { gap: space[2] },
  from: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  fromWords: { flex: 1, fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.ink },
  ago: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  title: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, letterSpacing: -0.18, color: color.ink },
  description: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  meta: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
  button: { flex: 1 },
  sent: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  sentWords: { flex: 1, gap: space[1] },
  sentTitle: { ...text.label, color: color.ink },
});
