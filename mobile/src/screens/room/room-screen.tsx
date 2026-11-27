/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-20  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { router, useIsFocused } from 'expo-router';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Chip,
  color,
  ErrorState,
  font,
  FullScreenPanel,
  LoadingState,
  space,
  useToastAbove,
} from '@/design-system';
import { heldAlone } from '@/features/quests/adapter';
import type { RoomView } from '@/features/quests/room-adapter';
import { useRoom } from '@/features/quests/use-room';
import { useWalkingTimes } from '@/features/quests/use-walking-times';
import { InfoBox, InfoLine, PostHost } from '../party/post-content';
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

// The title, then the 모집글 as 파티 모집글 draws it: the Leader's row without a mark, the text, the tags, and the box
// of the orange step's time and place with the event's line.
function Head({ room }: { room: RoomView }): ReactElement {
  const { quest, host, text: description, tags, time, place } = room;
  return (
    <View style={styles.head}>
      <Text accessibilityRole="header" style={styles.title}>
        {quest.title}
      </Text>
      {host === null ? null : <PostHost line={host.line} name={host.name} />}
      {description === '' ? null : <Text style={styles.description}>{description}</Text>}
      {tags.length === 0 ? null : (
        <View accessibilityLabel="태그" style={styles.tags}>
          {tags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </View>
      )}
      <InfoBox>
        <InfoLine icon="clock">{time}</InfoLine>
        <InfoLine icon="pin">{place}</InfoLine>
        {quest.globalEvent === null ? null : <RoomEvent event={quest.globalEvent} />}
      </InfoBox>
    </View>
  );
}

// The app bar's `수정` for the Quest's Leader, but not for a Quest taken alone, which gathers nobody and keeps its
// settings. `centred` keeps it on the title's line: a button otherwise stands at the top of the bar's row.
function EditAction({ room }: { room: RoomView }): ReactElement | null {
  const { quest, leads } = room;
  if (!leads || heldAlone(quest)) {
    return null;
  }
  return (
    <Button
      centred
      onPress={() => {
        router.push({ pathname: '/party-form', params: { questId: quest.id } });
      }}
      variant="ghost"
    >
      수정
    </Button>
  );
}

function partyOf(room: RoomView): 'leads' | 'member' | 'none' {
  if (room.activation.state !== 'in') {
    return 'none';
  }
  return room.activation.leadsParty ? 'leads' : 'member';
}

// The question before `나가기` or `파티 없애기`. The Leader's says that a Closed Quest only disappears and that a posted
// one also takes its post down, and either adds that sharing stops while the Quest's Party is switched on.
function goingAsk(room: RoomView, actions: RoomActions, onLeft: () => void): Ask {
  const party = partyOf(room);
  const switchedOn = room.leads ? room.activation.state !== 'none' : party !== 'none';
  const live = switchedOn ? ' 활성화 중이라 위치 공유도 바로 멈춰요.' : '';
  const leave = (left: boolean): void => {
    if (left) {
      onLeft();
    }
  };
  if (heldAlone(room.quest)) {
    return {
      title: '퀘스트를 없앨까요?',
      body: '퀘스트가 사라져요.',
      confirm: '퀘스트 없애기',
      danger: true,
      onConfirm: () => void actions.endQuest(room.quest.id, party, true).then(leave),
    };
  }
  return room.leads
    ? {
        title: '파티를 없앨까요?',
        body: `${room.hasPost ? '파티가 사라지고 모집글도 내려가요.' : '파티가 사라져요.'}${live}`,
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

// A Quest the User no longer holds closes its room, unless the User just left it here. The signed-in layout's
// `GoneQuestsWatch` tells it, once, whichever screen is shown.
function useCloseWhenGone(gone: boolean, left: { current: boolean }): void {
  useEffect(() => {
    if (gone && !left.current) {
      left.current = true;
      leaveRoom();
    }
  }, [gone, left]);
}

// The footer's full-width danger button: `나가기`, `파티 없애기` for the Leader, or `퀘스트 없애기` for a Quest taken
// alone.
function Footer({ room, onPress }: { room: RoomView; onPress: () => void }): ReactElement {
  const words = room.leads ? '파티 없애기' : '나가기';
  return (
    <Button full onPress={onPress} size="lg" variant="danger">
      {heldAlone(room.quest) ? '퀘스트 없애기' : words}
    </Button>
  );
}

interface BodyProps {
  room: RoomView;
  actions: RoomActions;
  onAsk: (ask: Ask) => void;
  // The room is in front: only then are the members' walking routes asked.
  open: boolean;
}

// The frame's order: the head, the activation, 일정, 신청, 멤버 and 초대 중. A Quest taken alone has no Party to switch
// on, which would show it to Friends, and no 멤버, as the User is its one Holder.
function Body({ room, actions, onAsk, open }: BodyProps): ReactElement {
  const walks = useWalkingTimes(room, open);
  const party = !heldAlone(room.quest);
  return (
    <View style={styles.body}>
      <Head room={room} />
      {party ? <ActivationBox actions={actions} onAsk={onAsk} room={room} /> : null}
      <PlanSection actions={actions} room={room} />
      <RequestsSection actions={actions} room={room} />
      {party ? <MembersSection actions={actions} room={room} walks={walks} /> : null}
      <InvitationsSection actions={actions} room={room} />
    </View>
  );
}

// The app bar's title, once the room is read: a Quest taken alone is a 퀘스트, any other a 파티.
function titleOf(room: RoomView): string {
  return heldAlone(room.quest) ? '퀘스트' : '파티';
}

// A Quest's room, the frame's `PartyDetail`: what the Holders plan, who comes and whether the Quest's Party runs.
// While the User types, the footer's 나가기 gives way, so that the field stands right above the keyboard.
export function RoomScreen({ questId }: { questId: string }): ReactElement {
  const { data: room, isPending, refetch, gone } = useRoom(questId);
  const actions = useRoomActions();
  const [ask, setAsk] = useState<Ask | null>(null);
  const left = useRef(false);
  const open = useIsFocused();
  useCloseWhenGone(gone, left);
  useToastAbove(FOOTER, open);
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
      actions={room === undefined ? undefined : <EditAction room={room} />}
      footerHidesForKeyboard
      leave={{ kind: 'back', onPress: leaveRoom }}
      title={room === undefined ? '' : titleOf(room)}
    >
      {room === undefined ? null : <Body actions={actions} onAsk={setAsk} open={open} room={room} />}
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
  head: { gap: space[3] },
  title: { fontFamily: font.bold, fontSize: 22, lineHeight: 30, letterSpacing: -0.33, color: color.ink },
  description: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.ink },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
