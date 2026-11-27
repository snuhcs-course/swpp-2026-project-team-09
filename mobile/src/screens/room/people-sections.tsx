/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { joinRequestsQuery, sentInvitationsQuery } from '@/api/queries';
import type { JoinRequest } from '@/api/waiting-types';
import { Button, color, Dialog, font, space } from '@/design-system';
import type { MemberView, RoomView } from '@/features/quests/room-adapter';
import { MemberFriendButton, useFriendPresses } from './member-friend-button';
import { PersonRow } from './person-row';
import { SectionTitle } from './section-title';
import type { RoomActions } from './use-room-actions';

interface SectionProps {
  room: RoomView;
  actions: RoomActions;
}

const STATE_INK = { live: color.live, muted: color.inkMuted, waiting: color.quest } as const;

// `신청 {n}`: the requests to join an Open or Approval Quest, for its Leader, each a name without a line. An Open Quest
// has them only from Users the Leader removed, each marked `전에 내보낸 멤버`.
export function RequestsSection({ room, actions }: SectionProps): ReactElement | null {
  const { quest, leads } = room;
  const asks = leads && quest.joinPolicy !== 'closed';
  const requests = useQuery({ ...joinRequestsQuery(quest.id), enabled: asks }).data ?? [];
  if (!asks || requests.length === 0) {
    return null;
  }
  return (
    <View accessibilityLabel="참여 신청" style={styles.section}>
      <SectionTitle icon="usersPlus">{`신청 ${requests.length}`}</SectionTitle>
      {requests.map((request, index) => (
        <PersonRow
          department={request.user.department}
          key={request.id}
          last={index === requests.length - 1}
          line={null}
          mark={request.removedBefore === true ? '전에 내보낸 멤버' : undefined}
          name={request.user.name}
        >
          <Button onPress={() => void actions.decline(quest.id, request)} variant="secondary">
            거절
          </Button>
          <Button onPress={() => void actions.accept(quest.id, request)}>수락</Button>
        </PersonRow>
      ))}
    </View>
  );
}

// `초대 중 {n}`: the invitations the Leader sent into the Quest, dimmed until the Friend answers.
export function InvitationsSection({ room, actions }: SectionProps): ReactElement | null {
  const { quest, leads } = room;
  const invitations: JoinRequest[] = useQuery({ ...sentInvitationsQuery(quest.id), enabled: leads }).data ?? [];
  if (!leads || invitations.length === 0) {
    return null;
  }
  return (
    <View accessibilityLabel="초대 중" style={styles.section}>
      <SectionTitle icon="send">{`초대 중 ${invitations.length}`}</SectionTitle>
      {invitations.map((invitation, index) => (
        <PersonRow
          department={invitation.user.department}
          dimmed
          key={invitation.id}
          last={index === invitations.length - 1}
          line={null}
          name={invitation.user.name}
        >
          <Button onPress={() => void actions.cancelInvitation(quest.id, invitation)} variant="secondary">
            초대 취소
          </Button>
        </PersonRow>
      ))}
    </View>
  );
}

// A press on a member the User sees shows them on the map with their card, as the friend list does.
function showMember(member: MemberView): void {
  router.dismissTo({ pathname: '/main', params: { person: member.id } });
}

// What a press on one of a member row's icons asks before it acts.
type AskAction = 'friend' | 'handOver' | 'remove';

interface Ask {
  action: AskAction;
  member: MemberView;
}

const ASKS = {
  friend: { title: (name: string) => `${name}님에게 친구 요청을 보낼까요?`, confirm: '요청', tone: 'primary' },
  handOver: { title: (name: string) => `${name}님에게 파티장을 넘길까요?`, confirm: '넘기기', tone: 'primary' },
  remove: { title: (name: string) => `${name}님을 파티에서 내보낼까요?`, confirm: '내보내기', tone: 'danger' },
} as const;

// 친구 추가 on another member's row and the Leader's 파티장 넘기기 and 내보내기 beside it, icons in a line.
function MemberControls({
  member,
  leads,
  onAsk,
}: {
  member: MemberView;
  leads: boolean;
  onAsk: (action: AskAction) => void;
}): ReactElement {
  return (
    <View style={styles.controls}>
      <MemberFriendButton
        member={member}
        onAdd={() => {
          onAsk('friend');
        }}
      />
      {leads ? (
        <>
          <Button
            icon="crown"
            label={`${member.name}님에게 파티장 넘기기`}
            onPress={() => {
              onAsk('handOver');
            }}
            variant="secondary"
          />
          <Button
            icon="userMinus"
            label={`${member.name}님 내보내기`}
            onPress={() => {
              onAsk('remove');
            }}
            variant="danger"
          />
        </>
      ) : null}
    </View>
  );
}

interface MemberRowProps {
  room: RoomView;
  member: MemberView;
  last: boolean;
  // `301동 앞까지 도보 8분` or `301동 앞에 있어요`, after the state of a member who shares.
  walk: string | undefined;
  onAsk: (action: AskAction) => void;
}

// A Holder, with the icons on every other row. Only one the User sees takes a press.
function MemberRow({ room, member, last, walk, onAsk }: MemberRowProps): ReactElement {
  const words = [member.late, member.state?.words, walk].filter((part) => part !== null && part !== undefined);
  return (
    <PersonRow
      department={member.department}
      last={last}
      leader={member.leader}
      line={words.length === 0 ? null : words.join(' · ')}
      lineInk={member.late === null ? (member.state === null ? undefined : STATE_INK[member.state.tone]) : color.quest}
      name={member.name}
      onPress={
        member.me || !member.seen
          ? undefined
          : () => {
              showMember(member);
            }
      }
    >
      {member.me ? null : <MemberControls leads={room.leads} member={member} onAsk={onAsk} />}
    </PersonRow>
  );
}

// The one dialog of the rows' icons. What was asked stays while it fades out, so that its words do not change as it
// goes, and acts only on its confirming answer.
function AskDialog({
  room,
  actions,
  ask,
  open,
  onClose,
}: SectionProps & { ask: Ask | null; open: boolean; onClose: () => void }): ReactElement {
  const presses = useFriendPresses();
  const words = ask === null ? null : ASKS[ask.action];
  const confirm = (): void => {
    onClose();
    if (!open || ask === null) {
      return;
    }
    const { action, member } = ask;
    if (action === 'friend') {
      presses.send(member);
    } else if (action === 'handOver') {
      void actions.handOver(room.quest.id, member);
    } else {
      void actions.removeHolder(room.quest.id, member);
    }
  };
  return (
    <Dialog
      cancelLabel="취소"
      confirmLabel={words?.confirm}
      onCancel={onClose}
      onConfirm={confirm}
      title={ask === null || words === null ? '' : words.title(ask.member.name)}
      tone={words?.tone}
      visible={open}
    />
  );
}

// `멤버 {n}`: the Holders, the Leader marked, with what the User sees of each while in the Party and how far each who
// shares is on foot (`walks`, by id), and the rows' icons, each of which asks first. An Open or Approval Quest shows
// its fill at the right, as 찾기's card does.
export function MembersSection({
  room,
  actions,
  walks,
}: SectionProps & { walks: Partial<Record<string, string>> }): ReactElement {
  const { members, fill } = room;
  const [ask, setAsk] = useState<Ask | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <View accessibilityLabel="멤버" style={styles.section}>
      <SectionTitle end={fill === null ? null : <Text style={styles.fill}>{fill}</Text>} icon="users">
        {`멤버 ${members.length}`}
      </SectionTitle>
      {members.map((member, index) => (
        <MemberRow
          key={member.id}
          last={index === members.length - 1}
          member={member}
          onAsk={(action) => {
            setAsk({ action, member });
            setOpen(true);
          }}
          room={room}
          walk={member.state?.tone === 'live' ? walks[member.id] : undefined}
        />
      ))}
      <AskDialog
        actions={actions}
        ask={ask}
        onClose={() => {
          setOpen(false);
        }}
        open={open}
        room={room}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[1] },
  fill: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: color.party },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
