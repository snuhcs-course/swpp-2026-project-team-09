import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { joinRequestsQuery, sentInvitationsQuery } from '@/api/queries';
import type { JoinRequest } from '@/api/waiting-types';
import { now } from '@/clock';
import { Avatar, Button, color, Dialog, font, Icon, radius, space, useToast } from '@/design-system';
import { agoWords, type MemberView, type RoomView } from '@/features/quests/room-adapter';
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

interface PersonRowProps {
  name: string;
  department: string;
  line: string | null;
  lineInk?: string;
  leader?: boolean;
  dimmed?: boolean;
  onPress?: () => void;
  children?: ReactNode;
}

function PersonRow({
  name,
  department,
  line,
  lineInk,
  leader = false,
  dimmed = false,
  onPress,
  children,
}: PersonRowProps): ReactElement {
  const words = (
    <>
      <View style={[styles.face, leader && styles.leaderRing, dimmed && styles.dimmed]}>
        <Avatar name={name} />
        {leader ? (
          <View accessibilityLabel="파티장" style={styles.crown}>
            <Icon color={color.onPrimary} name="crown" size={12} />
          </View>
        ) : null}
      </View>
      <View style={styles.words}>
        <View style={styles.nameLine}>
          <Text style={styles.name}>{name}</Text>
          {leader ? <Text style={styles.leaderPill}>파티장</Text> : null}
          <Text style={styles.department}>{department}</Text>
        </View>
        {line === null ? null : <Text style={[styles.line, { color: lineInk ?? color.inkMuted }]}>{line}</Text>}
      </View>
    </>
  );
  return (
    <View style={styles.row}>
      {onPress === undefined ? (
        <View style={styles.person}>{words}</View>
      ) : (
        <Pressable
          accessibilityLabel={`${name}${line === null ? '' : ` · ${line}`}`}
          accessibilityRole="button"
          onPress={onPress}
          style={styles.person}
        >
          {words}
        </Pressable>
      )}
      {children}
    </View>
  );
}

// `신청 {n}`: the requests to join an Approval Quest, for its Leader.
export function RequestsSection({ room, actions }: SectionProps): ReactElement | null {
  const { quest, leads } = room;
  const asks = leads && quest.joinPolicy === 'approval';
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
          line={agoWords(request.sentAt, now())}
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

// `초대 중 {n}`: the invitations the Leader sent into the Quest, which wait.
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
          line={agoWords(invitation.sentAt, now())}
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
      showToast(`${member.name}님은 위치가 꺼져 있어요`);
    }
  };
}

interface MemberRowProps extends SectionProps {
  member: MemberView;
  onHandOver: () => void;
}

// A Holder, with the Leader's controls on every other row.
function MemberRow({ room, actions, member, onHandOver }: MemberRowProps): ReactElement {
  const { quest, leads, activation } = room;
  const show = useShowMember();
  // The Leader of the Party also takes the Holder out of it.
  const fromParty = activation.state === 'in' && activation.leadsParty && member.state?.tone !== 'waiting';
  return (
    <PersonRow
      department={member.department}
      leader={member.leader}
      line={member.state?.words ?? null}
      lineInk={member.state === null ? undefined : STATE_INK[member.state.tone]}
      name={member.name}
      onPress={
        member.me
          ? undefined
          : () => {
              show(member);
            }
      }
    >
      {leads && !member.me ? (
        <View style={styles.controls}>
          <Button onPress={onHandOver} variant="secondary">
            파티장 넘기기
          </Button>
          <Button onPress={() => void actions.removeHolder(quest.id, member, fromParty)} variant="danger">
            내보내기
          </Button>
        </View>
      ) : null}
    </PersonRow>
  );
}

// `멤버 {n}`: the Holders, the Leader marked, with what the User sees of each while in the Party, and the Leader's
// controls.
export function MembersSection({ room, actions }: SectionProps): ReactElement {
  const { quest, members, left, activation } = room;
  const [handing, setHanding] = useState<MemberView | null>(null);
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
          actions={actions}
          key={member.id}
          member={member}
          onHandOver={() => {
            setHanding(member);
          }}
          room={room}
        />
      ))}
      <Dialog
        cancelLabel="취소"
        confirmLabel="넘기기"
        onCancel={() => {
          setHanding(null);
        }}
        onConfirm={() => {
          if (handing !== null) {
            void actions.handOver(quest.id, handing);
          }
          setHanding(null);
        }}
        title={handing === null ? '' : `${handing.name}님에게 파티장을 넘길까요?`}
        visible={handing !== null}
      />
    </View>
  );
}

const CROWN = 20;

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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64 },
  face: { borderRadius: radius.full },
  leaderRing: { boxShadow: `0 0 0 2px ${color.surface}, 0 0 0 4px #E8A400` },
  dimmed: { opacity: 0.6 },
  crown: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    alignItems: 'center',
    justifyContent: 'center',
    width: CROWN,
    height: CROWN,
    borderWidth: 2,
    borderColor: color.surface,
    borderRadius: radius.full,
    backgroundColor: '#E8A400',
  },
  words: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  name: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  leaderPill: {
    paddingHorizontal: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: '#FFF4D6',
    fontFamily: font.bold,
    fontSize: 11,
    lineHeight: 18,
    color: '#8A5A00',
  },
  department: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  line: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  controls: { gap: space[1] },
});
