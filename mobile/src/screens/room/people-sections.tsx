/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { joinRequestsQuery, sentInvitationsQuery } from '@/api/queries';
import type { JoinRequest } from '@/api/waiting-types';
import { now } from '@/clock';
import { Button, color, Dialog, font, Icon, space, useToast } from '@/design-system';
import { agoWords, type MemberView, type RoomView } from '@/features/quests/room-adapter';
import { MemberFriendButton, useFriendPresses } from './member-friend-button';
import { PersonRow } from './person-row';
import type { RoomActions } from './use-room-actions';

interface SectionProps {
  room: RoomView;
  actions: RoomActions;
}

const STATE_INK = { live: color.live, muted: color.inkMuted, waiting: color.quest } as const;

function Heading({ children, aside }: { children: string; aside?: string | null }): ReactElement {
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.headingWords}>
        {children}
      </Text>
      {aside === undefined || aside === null ? null : <Text style={styles.aside}>{aside}</Text>}
    </View>
  );
}

// `신청 {n}`: the requests to join an Open or Approval Quest, for its Leader, each with the note its User wrote, or when
// it came where no note is known. An Open Quest has them only from Users the Leader removed, each marked `전에 내보낸
// 멤버`.
export function RequestsSection({ room, actions }: SectionProps): ReactElement | null {
  const { quest, leads } = room;
  const asks = leads && quest.joinPolicy !== 'closed';
  const requests = useQuery({ ...joinRequestsQuery(quest.id), enabled: asks }).data ?? [];
  if (!asks || requests.length === 0) {
    return null;
  }
  return (
    <View accessibilityLabel="참여 신청" style={styles.section}>
      <Heading>{`신청 ${requests.length}`}</Heading>
      {requests.map((request) => (
        <PersonRow
          department={request.user.department}
          key={request.id}
          line={request.note ?? agoWords(request.sentAt, now())}
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

// `초대 중 {n}`: the invitations the Leader sent into the Quest, each `응답 대기` until the Friend answers.
export function InvitationsSection({ room, actions }: SectionProps): ReactElement | null {
  const { quest, leads } = room;
  const invitations: JoinRequest[] = useQuery({ ...sentInvitationsQuery(quest.id), enabled: leads }).data ?? [];
  if (!leads || invitations.length === 0) {
    return null;
  }
  return (
    <View accessibilityLabel="초대 중" style={styles.section}>
      <Heading>{`초대 중 ${invitations.length}`}</Heading>
      {invitations.map((invitation) => (
        <PersonRow
          department={invitation.user.department}
          dimmed
          key={invitation.id}
          line="응답 대기"
          lineInk={STATE_INK.waiting}
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
function useShowMember(): (member: MemberView) => void {
  const showToast = useToast();
  return (member) => {
    if (member.seen) {
      router.dismissTo({ pathname: '/main', params: { person: member.id } });
    } else {
      showToast(`${member.name}님은 위치가 꺼져 있어요`, undefined, 'alert');
    }
  };
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

// The Leader of the Party also takes the Holder out of it.
function removesFromParty({ activation }: RoomView, member: MemberView): boolean {
  return activation.state === 'in' && activation.leadsParty && member.state?.tone !== 'waiting';
}

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
  // `301동 앞까지 도보 8분` or `301동 앞에 있어요`, after the state of a member who shares.
  walk: string | undefined;
  onAsk: (action: AskAction) => void;
}

// A Holder, with the icons on every other row.
function MemberRow({ room, member, walk, onAsk }: MemberRowProps): ReactElement {
  const show = useShowMember();
  const words = [member.late, member.state?.words, walk].filter((part) => part !== null && part !== undefined);
  return (
    <PersonRow
      department={member.department}
      leader={member.leader}
      line={words.length === 0 ? null : words.join(' · ')}
      lineInk={member.late === null ? (member.state === null ? undefined : STATE_INK[member.state.tone]) : color.quest}
      name={member.name}
      onPress={
        member.me
          ? undefined
          : () => {
              show(member);
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
      void actions.removeHolder(room.quest.id, member, removesFromParty(room, member));
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
// shares is on foot (`walks`, by id), and the rows' icons, each of which asks first.
export function MembersSection({
  room,
  actions,
  walks,
}: SectionProps & { walks: Partial<Record<string, string>> }): ReactElement {
  const { members, left, activation } = room;
  const [ask, setAsk] = useState<Ask | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <View accessibilityLabel="멤버" style={styles.section}>
      <Heading aside={left}>{`멤버 ${members.length}`}</Heading>
      {activation.state === 'waiting' || activation.state === 'declined' ? (
        <View style={styles.lock}>
          <Icon color={color.inkMuted} name="lock" size={14} />
          <Text style={styles.lockWords}>활성화에 참여해야 멤버 위치를 볼 수 있어요</Text>
        </View>
      ) : null}
      {members.map((member) => (
        <MemberRow
          key={member.id}
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
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  headingWords: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, color: color.ink },
  aside: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  lock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: 10,
    backgroundColor: '#F0F2F6',
  },
  lockWords: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
