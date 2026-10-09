// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by fyoon46
import { router, useIsFocused } from 'expo-router';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Button,
  color,
  ErrorState,
  font,
  FullScreenPanel,
  LoadingState,
  radius,
  space,
  useToast,
  useToastAbove,
} from '@/design-system';
import type { RoomView } from '@/features/quests/room-adapter';
import { useRoom } from '@/features/quests/use-room';
import { ActivationBox } from './activation-box';
import { type Ask, ConfirmSheet } from './confirm-sheet';
import { InvitationsSection, MembersSection, RequestsSection } from './people-sections';
import { PlanSection } from './plan-section';
import { RoomEvent } from './room-event';
import { type RoomActions, useRoomActions } from './use-room-actions';

// The footer's button, its padding and its line: a toast sits above it.
const FOOTER = 81;

// Back to where the room was opened from, or to the map when it was the first screen.
function leaveRoom(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/main');
  }
}

function Head({ room }: { room: RoomView }): ReactElement {
  const { description } = room.quest;
  return (
    <View style={styles.head}>
      <View style={styles.badges}>
        {room.badges.map(({ label, tone, icon }) => (
          <Badge icon={icon} key={label} tone={tone}>
            {label}
          </Badge>
        ))}
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {room.quest.title}
      </Text>
      {room.quest.globalEvent === null ? null : <RoomEvent event={room.quest.globalEvent} />}
      {description === '' ? null : (
        <View style={styles.quote}>
          <Text style={styles.quoteWords}>{description}</Text>
        </View>
      )}
    </View>
  );
}

// The app bar's `모집글 보기` for an Open or Approval Quest, and `수정` for its Leader.
function RecruitingActions({ room }: { room: RoomView }): ReactElement {
  const { quest, leads } = room;
  return (
    <View style={styles.actions}>
      {quest.joinPolicy === 'closed' ? null : (
        <Button
          onPress={() => {
            router.push(`/post/${quest.id}`);
          }}
          variant="secondary"
        >
          모집글 보기
        </Button>
      )}
      {leads ? (
        <Button
          onPress={() => {
            router.push({ pathname: '/party-form', params: { questId: quest.id } });
          }}
          variant="ghost"
        >
          수정
        </Button>
      ) : null}
    </View>
  );
}

function partyOf(room: RoomView): 'leads' | 'member' | 'none' {
  if (room.activation.state !== 'in') {
    return 'none';
  }
  return room.activation.leadsParty ? 'leads' : 'member';
}

// The question before `나가기` or `파티 없애기`.
function goingAsk(room: RoomView, actions: RoomActions, onLeft: () => void): Ask {
  const party = partyOf(room);
  const live = party === 'none' ? '' : ' 활성화 중이라 위치 공유도 바로 멈춰요.';
  const leave = (left: boolean): void => {
    if (left) {
      onLeft();
    }
  };
  return room.leads
    ? {
        title: '파티를 없앨까요?',
        body: `파티가 사라지고 모집글도 내려가요.${live}`,
        confirm: '파티 없애기',
        danger: true,
        onConfirm: () => void actions.endQuest(room.quest.id, party).then(leave),
      }
    : {
        title: '파티에서 나갈까요?',
        body: `내 파티 목록에서 사라져요.${live}`,
        confirm: '나가기',
        danger: true,
        onConfirm: () => void actions.leaveQuest(room.quest.id, party).then(leave),
      };
}

// A Quest the User no longer holds closes its room, unless the User just left it here.
function useCloseWhenGone(gone: boolean, left: { current: boolean }): void {
  const showToast = useToast();
  useEffect(() => {
    if (gone && !left.current) {
      left.current = true;
      showToast('파티에서 빠졌어요');
      leaveRoom();
    }
  }, [gone, left, showToast]);
}

// The footer's full-width danger button: `나가기`, or `파티 없애기` for the Leader.
function Footer({ room, onPress }: { room: RoomView; onPress: () => void }): ReactElement {
  return (
    <Button full onPress={onPress} size="lg" variant="danger">
      {room.leads ? '파티 없애기' : '나가기'}
    </Button>
  );
}

// A Quest's room, the frame's `PartyDetail`: what the Holders plan, who comes and whether the Quest's Party runs.
export function RoomScreen({ questId }: { questId: string }): ReactElement {
  const { data: room, isPending, refetch, gone } = useRoom(questId);
  const actions = useRoomActions();
  const [ask, setAsk] = useState<Ask | null>(null);
  const left = useRef(false);
  useCloseWhenGone(gone, left);
  useToastAbove(FOOTER, useIsFocused());
  const onLeft = (): void => {
    left.current = true;
    leaveRoom();
  };
  return (
    <FullScreenPanel
      footer={
        room === undefined ? undefined : (
          <Footer
            onPress={() => {
              setAsk(goingAsk(room, actions, onLeft));
            }}
            room={room}
          />
        )
      }
      actions={room === undefined ? undefined : <RecruitingActions room={room} />}
      leave={{ kind: 'back', onPress: leaveRoom }}
      title="파티"
    >
      {room === undefined ? null : (
        <View style={styles.body}>
          <Head room={room} />
          <ActivationBox actions={actions} onAsk={setAsk} room={room} />
          <PlanSection actions={actions} room={room} />
          <RequestsSection actions={actions} room={room} />
          <MembersSection actions={actions} room={room} />
          <InvitationsSection actions={actions} room={room} />
        </View>
      )}
      {room === undefined && isPending ? <LoadingState /> : null}
      {room === undefined && !isPending && !gone ? <ErrorState onRetry={refetch} /> : null}
      <ConfirmSheet
        ask={ask}
        label="확인"
        onClose={() => {
          setAsk(null);
        }}
      />
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[6], paddingTop: space[5], paddingHorizontal: space[4], paddingBottom: space[6] },
  head: { gap: space[2] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { fontFamily: font.bold, fontSize: 22, lineHeight: 30, letterSpacing: -0.33, color: color.ink },
  quote: {
    paddingVertical: space[3],
    paddingHorizontal: 14,
    borderLeftWidth: 3,
    borderLeftColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSubtle,
  },
  quoteWords: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.ink },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
});
