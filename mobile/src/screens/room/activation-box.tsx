// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by fyoon46
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, color, font, Icon, radius, space, SwitchRow } from '@/design-system';
import { useMasterSwitch } from '@/features/sharing/use-master-switch';
import type { RoomView } from '@/features/quests/room-adapter';
import { opensParty } from '@/features/quests/rules';
import { myUserId } from '@/auth/sign-in';
import type { Ask } from './confirm-sheet';
import type { RoomActions } from './use-room-actions';

interface ActivationBoxProps {
  room: RoomView;
  actions: RoomActions;
  onAsk: (ask: Ask) => void;
}

// The question before leaving the 활성화, also asked from the map for a Party tied to no Quest.
export function leaveAsk(onConfirm: () => void): Ask {
  return {
    title: '활성화에서 나갈까요?',
    body: '내 위치 공유가 멈추고 멤버 위치도 볼 수 없어요.\n파티에는 그대로 남아요.',
    confirm: '나가기',
    danger: true,
    onConfirm,
  };
}

function switchLine(otherParty: string | null): string {
  return otherParty === null
    ? ''
    : `\n한 번에 한 파티에만 참여할 수 있어요. 지금 참여 중인 ‘${otherParty}’ 활성화에서는 나가게 돼요.`;
}

// The question before entering a Party while the User is in another, also asked from 내 파티.
export function joinAsk(title: string, otherParty: string, onConfirm: () => void): Ask {
  return {
    title: `‘${title}’ 활성화에 참여할까요?`,
    body: `참여한 멤버끼리 서로 위치를 볼 수 있어요.${switchLine(otherParty)}`,
    confirm: '나가고 참여',
    danger: false,
    onConfirm,
  };
}

const SWITCH_OFF_LINE = '\n내 정보에서 위치 공유를 켜야 멤버에게 내 위치가 보여요';

const TONES = {
  none: { ground: color.surface, edge: color.border, round: color.snuBlue, width: 1 },
  in: { ground: '#EAF6F0', edge: '#9FD4BD', round: color.live, width: 1 },
  waiting: { ground: color.blue50, edge: color.snuBlue, round: color.snuBlue, width: 2 },
  declined: { ground: '#F0F2F6', edge: '#D8DCE5', round: color.inkMuted, width: 1 },
} as const;

interface Shown {
  title: string;
  sub: string;
  buttons: { label: string; variant: 'primary' | 'secondary' | 'danger'; onPress: () => void }[];
}

type ShownButton = Shown['buttons'][number];

function openButton({ room, actions, onAsk }: ActivationBoxProps, masterSwitch: boolean): ShownButton {
  const { quest, otherParty } = room;
  const others = quest.holders.length - 1;
  const notice = others > 0 ? `멤버 ${others}명에게 알림이 가요. ` : '';
  return {
    label: '파티 활성화',
    variant: 'primary',
    onPress: () => {
      onAsk({
        title: '파티를 활성화할까요?',
        body: `${notice}수락한 멤버끼리만 서로 위치를 볼 수 있어요.${switchLine(otherParty)}${masterSwitch ? '' : SWITCH_OFF_LINE}`,
        confirm: '활성화',
        danger: false,
        onConfirm: () => void actions.openParty(quest, others, otherParty !== null),
      });
    },
  };
}

// The Leader of the Party ends it for everyone; a member leaves it.
function outButton({ actions, onAsk }: ActivationBoxProps, leadsParty: boolean): ShownButton {
  if (!leadsParty) {
    return {
      label: '활성화에서 나가기',
      variant: 'danger',
      onPress: () => {
        onAsk(leaveAsk(() => void actions.leaveParty()));
      },
    };
  }
  return {
    label: '활성화 끄기',
    variant: 'danger',
    onPress: () => {
      onAsk({
        title: '활성화를 끌까요?',
        body: '모든 멤버의 위치 공유가 멈춰요.\n파티는 그대로 남아요.',
        confirm: '끄기',
        danger: true,
        onConfirm: () => void actions.endParty(),
      });
    },
  };
}

// `참여` enters at once, and asks first when the User must leave another Party for it.
function joinButton({ room, actions, onAsk }: ActivationBoxProps, partyId: string, title: string): ShownButton {
  const { otherParty } = room;
  return {
    label: '참여',
    variant: 'primary',
    onPress: () => {
      if (otherParty === null) {
        void actions.joinParty(partyId, false);
        return;
      }
      onAsk(joinAsk(title, otherParty, () => void actions.joinParty(partyId, true)));
    },
  };
}

function useShown(props: ActivationBoxProps): Shown {
  const masterSwitch = useMasterSwitch().on;
  const { activation, quest } = props.room;
  if (activation.state === 'none') {
    return {
      title: '아직 활성화하지 않았어요',
      sub: '켜면 멤버에게 알림이 가고, 수락한 멤버끼리 위치를 공유해요',
      buttons: opensParty(quest, myUserId()) ? [openButton(props, masterSwitch)] : [],
    };
  }
  if (activation.state === 'in') {
    return {
      title: '활성화 중',
      sub:
        activation.sharing > 1
          ? `${activation.sharing}명이 서로 위치를 공유하고 있어요`
          : '멤버의 응답을 기다리는 중이에요',
      buttons: [outButton(props, activation.leadsParty)],
    };
  }
  const join = joinButton(props, activation.partyId, activation.title);
  if (activation.state === 'declined') {
    return { title: '활성화 중인 파티예요', sub: '나는 참여하지 않는 중 · 위치를 공유하지 않아요', buttons: [join] };
  }
  const decline: ShownButton = {
    label: '거절',
    variant: 'secondary',
    onPress: () => {
      props.actions.declineParty(activation.partyId);
    },
  };
  return {
    title: activation.leader === null ? '파티가 활성화됐어요' : `${activation.leader}님이 파티를 활성화했어요`,
    sub: '수락하면 참여한 멤버끼리 위치를 공유해요',
    buttons: [decline, join],
  };
}

// The box `파티 활성화` of the frame's room, in one of its four states.
export function ActivationBox(props: ActivationBoxProps): ReactElement {
  const { room, actions } = props;
  const { title, sub, buttons } = useShown(props);
  const tone = TONES[room.activation.state];
  return (
    <View
      accessibilityLabel="파티 활성화"
      style={[styles.box, { backgroundColor: tone.ground, borderColor: tone.edge, borderWidth: tone.width }]}
    >
      <View style={styles.head}>
        <View style={[styles.round, { backgroundColor: tone.round }]}>
          <Icon color={color.onPrimary} name="pin" size={18} />
        </View>
        <View style={styles.words}>
          <Text style={[styles.title, room.activation.state === 'in' && styles.titleIn]}>{title}</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
      </View>
      {room.activation.state === 'in' ? (
        <SwitchRow
          label="내 위치 공유"
          onValueChange={(on) => void actions.setSharing(on)}
          value={room.activation.switchOn}
        />
      ) : null}
      {buttons.length === 0 ? null : (
        <View style={styles.buttons}>
          {buttons.map(({ label, variant, onPress }) => (
            <View key={label} style={styles.button}>
              <Button full onPress={onPress} variant={variant}>
                {label}
              </Button>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const ROUND = 36;

const styles = StyleSheet.create({
  box: { gap: space[3], padding: 14, borderRadius: radius.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { alignItems: 'center', justifyContent: 'center', width: ROUND, height: ROUND, borderRadius: radius.full },
  words: { flex: 1 },
  title: { fontFamily: font.bold, fontSize: 15, lineHeight: 22, color: color.ink },
  titleIn: { color: color.live },
  sub: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2] },
  button: { flex: 1 },
});
