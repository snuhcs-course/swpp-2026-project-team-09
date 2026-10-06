import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { QuestInvitation } from '@/api/waiting-types';
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
  SectionHeader,
  space,
} from '@/design-system';
import { useInvitations } from '@/features/party/use-party';
import { agoWords } from '@/features/quests/room-adapter';
import { type PartyActions, usePartyActions } from './use-party-actions';

function InvitationCard({ invitation, actions }: { invitation: QuestInvitation; actions: PartyActions }): ReactElement {
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
      <Text style={styles.meta}>{`${quest.holderCount}명 참여 중`}</Text>
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

// 초대, the frame's `PartyInvites`: the invitations into Quests, the newest first.
export function InvitesTab(): ReactElement {
  const { data: invitations, isPending, refetch } = useInvitations();
  const actions = usePartyActions();
  return (
    <ScrollView contentContainerStyle={styles.body}>
      {invitations === undefined && isPending ? <LoadingState /> : null}
      {invitations === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      {invitations === undefined ? null : <SectionHeader>{`받은 초대 · ${String(invitations.length)}`}</SectionHeader>}
      {invitations?.length === 0 ? <EmptyState icon="users" words="받은 초대가 없어요" /> : null}
      {(invitations ?? []).map((invitation) => (
        <InvitationCard actions={actions} invitation={invitation} key={invitation.id} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], padding: space[4] },
  card: { gap: space[2] },
  from: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  fromWords: { flex: 1, fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.ink },
  ago: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  title: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, letterSpacing: -0.18, color: color.ink },
  description: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  meta: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
  button: { flex: 1 },
});
