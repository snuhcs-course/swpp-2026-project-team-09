/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { questRemovalsQuery } from '@/api/queries';
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
import { planWords } from '@/features/party/posts';
import { useInvitations, useSentRequests } from '@/features/party/use-party';
import { agoWords } from '@/features/quests/room-adapter';
import { REMOVED_CAPTION } from '@/features/quests/refusals';
import { type Ask, ConfirmSheet } from '../room/confirm-sheet';
import { Line, openPost } from './post-card';
import { type PartyActions, showFind, usePartyActions, withdrawAsk } from './use-party-actions';

// `{names} 함께` of the members' faces, which only the mock build adds; otherwise the card counts the Holders.
function membersOf({ quest }: ShownQuestInvitation): string {
  const companions = quest.faces.slice(1).map(({ name }) => name);
  return companions.length === 0 ? `${String(quest.holderCount)}명 참여 중` : `${companions.join(', ')} 함께`;
}

// When and where the 파티 next meets, under the title, since a 비공개 파티's post cannot be read before entering: the
// clock with its time, then the pin with its place, each on a line of its own.
function InvitationPlan({ next }: { next: ShownQuestInvitation['nextSubQuest'] }): ReactElement {
  const { time, place } = planWords(next);
  return (
    <View style={styles.plan}>
      <Line icon="clock">{time}</Line>
      <Line icon="pin">{place}</Line>
    </View>
  );
}

function InvitationCard({
  invitation,
  actions,
}: {
  invitation: ShownQuestInvitation;
  actions: PartyActions;
}): ReactElement {
  const { quest, sentAt, invitedBy } = invitation;
  const kind = quest.joinPolicy === 'closed' ? '비공개 파티에' : '파티에';
  return (
    <View accessibilityLabel={quest.title} style={[cardStyles.card, styles.card]}>
      <View style={styles.from}>
        <Avatar name={invitedBy.name} size="sm" />
        <Text numberOfLines={1} style={styles.fromWords}>{`${invitedBy.name}님이 ${kind} 초대했어요`}</Text>
        <Text style={styles.ago}>{agoWords(sentAt, now())}</Text>
      </View>
      <Text style={styles.title}>{quest.title}</Text>
      <InvitationPlan next={invitation.nextSubQuest} />
      {quest.description === '' ? null : (
        <Text numberOfLines={2} style={styles.description}>
          {quest.description}
        </Text>
      )}
      <Text style={styles.meta}>{membersOf(invitation)}</Text>
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

// A request the User sent: a press of its title opens the post, and `신청 취소` asks before withdrawing. `removed`: the
// Leader removed the User from the Quest before.
function SentRequestRow({
  request,
  removed,
  onWithdraw,
}: {
  request: MyJoinRequest;
  removed: boolean;
  onWithdraw: () => void;
}): ReactElement {
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
        {removed ? <Text style={styles.caption}>{REMOVED_CAPTION}</Text> : null}
      </Pressable>
      <Button onPress={onWithdraw} variant="secondary">
        신청 취소
      </Button>
    </View>
  );
}

// `보낸 신청`: the User's waiting requests to join, the newest first, beside the invitations received.
function SentRequests({ actions }: { actions: PartyActions }): ReactElement {
  const { data: requests, isPending, refetch } = useSentRequests();
  // Only marks a row, so a list that does not come marks none.
  const removedIds = useQuery(questRemovalsQuery).data ?? [];
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
            setAsk(
              withdrawAsk(
                { requestId: request.id, questId: request.quest.id, title: request.quest.title },
                actions.withdraw,
              ),
            );
          }}
          removed={removedIds.includes(request.quest.id)}
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
  plan: { gap: space[1] },
  description: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  meta: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
  button: { flex: 1 },
  sent: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  sentWords: { flex: 1, gap: space[1] },
  sentTitle: { ...text.label, color: color.ink },
  caption: { ...text.caption, color: color.inkMuted },
});
