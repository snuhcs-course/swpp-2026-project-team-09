/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, cardStyles, color, font, Icon, shadow, space } from '@/design-system';
import { useMasterSwitch } from '@/features/sharing/use-master-switch';
import type { ActivationView, OtherParty, PartyPerson, RoomView } from '@/features/quests/room-adapter';
import { opensParty } from '@/features/quests/rules';
import { myUserId } from '@/auth/sign-in';
import { LocationExplanation } from '../main/location-explanation';
import { type SharingSwitch, useSharingSwitch } from '../me/use-sharing-switch';
import { LiveDot } from '../party/live-dot';
import type { Ask } from './confirm-sheet';
import { ACTIVATION_HELP, HelpButton } from './help-bubble';
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

// The frame's words for the other Party: the User leaves it, or ends the one the User switched on (leads).
function switchLine(otherParty: OtherParty | null): string {
  if (otherParty === null) {
    return '';
  }
  const { title, leads } = otherParty;
  return `\n한 번에 한 파티에만 참여할 수 있어요. ${
    leads ? `내가 켠 ‘${title}’ 활성화는 꺼져요.` : `지금 참여 중인 ‘${title}’ 활성화에서는 나가게 돼요.`
  }`;
}

// How the User gets out of the other Party first: `end` for one the User leads, as the sheet says.
export function leavingOf(otherParty: OtherParty | null): boolean | 'end' {
  if (otherParty === null) {
    return false;
  }
  return otherParty.leads ? 'end' : true;
}

// The question before entering a Party while the User is in another, also asked from 내 파티, which names the other
// Party by its title alone.
export function joinAsk(title: string, other: string | OtherParty, onConfirm: () => void): Ask {
  const otherParty = typeof other === 'string' ? { title: other, leads: false } : other;
  return {
    title: `‘${title}’ 활성화에 참여할까요?`,
    body: `참여한 멤버끼리 서로 위치를 볼 수 있어요.${switchLine(otherParty)}`,
    confirm: '나가고 참여',
    danger: false,
    onConfirm,
  };
}

// The question before opening the Quest's Party, `others` being its other Holders, also asked from the time to leave.
// Opening sends no push: the others see it in their 알림 list.
export function openAsk(others: number, otherParty: OtherParty | null, onConfirm: () => void): Ask {
  const notice = others > 0 ? '다른 멤버의 알림 목록에 떠요. ' : '';
  return {
    title: '파티를 활성화할까요?',
    body: `${notice}수락한 멤버끼리만 서로 위치를 볼 수 있어요.${switchLine(otherParty)}`,
    confirm: '활성화',
    danger: false,
    onConfirm,
  };
}

// The one question before opening or entering while the Master Switch is off, nobody seeing the User until it is on.
// Its confirm turns it on and goes on at once.
function masterAsk(opening: boolean, otherParty: OtherParty | null, onConfirm: () => void): Ask {
  return {
    title: '전체 위치 공유를 켤까요?',
    body: `전체 위치 공유가 꺼져 있으면 활성화에 참여해도 서로의 위치가 보이지 않아요. 켜면 바로 활성화에 참여해요.${switchLine(otherParty)}`,
    confirm: opening ? '켜고 활성화' : '켜고 참여',
    danger: false,
    onConfirm,
  };
}

interface Steps extends ActivationBoxProps {
  sharing: SharingSwitch;
  masterOff: boolean;
}

// `파티 활성화`: the Master Switch's question first while it is off, else the opening's own.
function openParty({ room, actions, onAsk, sharing, masterOff }: Steps): void {
  const { quest, otherParty } = room;
  const open = (): void => void actions.openParty(quest, leavingOf(otherParty));
  if (masterOff) {
    onAsk(
      masterAsk(true, otherParty, () => {
        sharing.change(true, open);
      }),
    );
  } else {
    onAsk(openAsk(quest.holders.length - 1, otherParty, open));
  }
}

// `나도 참여`: the Master Switch's question first while it is off, else at once, or after the question of leaving the
// other Party.
function joinParty({ room, actions, onAsk, sharing, masterOff }: Steps, partyId: string, title: string): void {
  const { otherParty } = room;
  const join = (): void => void actions.joinParty(partyId, leavingOf(otherParty));
  if (masterOff) {
    onAsk(
      masterAsk(false, otherParty, () => {
        sharing.change(true, join);
      }),
    );
  } else if (otherParty === null) {
    join();
  } else {
    onAsk(joinAsk(title, otherParty, join));
  }
}

// `위치 공유 켜고 참여` of a member nobody sees: turns on whichever switch is off, the Master Switch first.
function shareAgain({ actions, sharing, masterOff }: Steps, switchOn: boolean): void {
  const partySwitch = (): void => {
    if (!switchOn) {
      void actions.setSharing(true);
    }
  };
  if (masterOff) {
    sharing.change(true, partySwitch);
  } else {
    partySwitch();
  }
}

// The Leader of the Party ends it for everyone; a member leaves it.
function outButton({ actions, onAsk }: ActivationBoxProps, leadsParty: boolean): ReactElement {
  const ask: Ask = leadsParty
    ? {
        title: '활성화를 끌까요?',
        body: '모든 멤버의 위치 공유가 멈춰요.\n파티는 그대로 남아요.',
        confirm: '끄기',
        danger: true,
        onConfirm: () => void actions.endParty(),
      }
    : leaveAsk(() => void actions.leaveParty());
  return (
    <Button
      full
      onPress={() => {
        onAsk(ask);
      }}
      variant="danger"
    >
      {leadsParty ? '활성화 끄기' : '활성화에서 나가기'}
    </Button>
  );
}

// The faces of those in, overlapping, and "이서연, 나, 박지호 참여 중".
function People({ people }: { people: readonly PartyPerson[] }): ReactElement | null {
  if (people.length === 0) {
    return null;
  }
  const words = `${people.map(({ name, me }) => (me ? '나' : name)).join(', ')} 참여 중`;
  return (
    <View accessibilityLabel={words} accessible style={styles.people}>
      <View style={styles.faces}>
        {people.map(({ id, name }, index) => (
          <View key={id} style={[styles.face, index > 0 && styles.overlap]}>
            <Avatar name={name} size="xs" />
          </View>
        ))}
      </View>
      <Text numberOfLines={2} style={styles.peopleWords}>
        {words}
      </Text>
    </View>
  );
}

type Running = Exclude<ActivationView, { state: 'none' }>;

// `활성화 끄기` or `활성화에서 나가기` for the User in; `위치 공유 켜고 참여` for one in whom nobody sees; else `나도 참여`.
function cardButton(props: Steps & { activation: Running }): ReactElement {
  const { activation } = props;
  if (activation.state === 'in' && activation.joined) {
    return outButton(props, activation.leadsParty);
  }
  if (activation.state === 'in') {
    const { switchOn } = activation;
    return (
      <Button
        full
        onPress={() => {
          shareAgain(props, switchOn);
        }}
      >
        위치 공유 켜고 참여
      </Button>
    );
  }
  const { partyId, title } = activation;
  return (
    <Button
      full
      onPress={() => {
        joinParty(props, partyId, title);
      }}
    >
      나도 참여
    </Button>
  );
}

// The white card of a running Party: the red light, those in, and the User's way in or out. Outlined as 내 파티's
// card while the User is in, whom nobody sees while a switch is off.
function LiveCard(props: Steps & { activation: Running }): ReactElement {
  const { activation } = props;
  const member = activation.state === 'in';
  const joined = member && activation.joined;
  return (
    <View style={[cardStyles.card, styles.card, joined && styles.live]} testID="activation-card">
      <View style={styles.top}>
        <LiveDot />
        <Text style={styles.liveWords}>활성화 중</Text>
        <View style={styles.grow} />
        <HelpButton help={ACTIVATION_HELP} size={18} />
      </View>
      <People people={activation.people} />
      {member && !joined ? (
        <View style={styles.off}>
          <Icon color={color.warning} name="alert" size={14} />
          <Text style={styles.offWords}>전체 위치 공유가 꺼져 있어서 참여하지 않은 상태예요</Text>
        </View>
      ) : null}
      {cardButton(props)}
    </View>
  );
}

// The room's 활성화: `파티 활성화` with its ? while no Party runs for the Quest, else the card of the running one.
export function ActivationBox(props: ActivationBoxProps): ReactElement | null {
  const { room } = props;
  const sharing = useSharingSwitch();
  const masterOff = useMasterSwitch().off;
  const steps: Steps = { ...props, sharing, masterOff };
  const { activation } = room;
  if (activation.state === 'none' && !opensParty(room.quest, myUserId())) {
    return null;
  }
  return (
    <View accessibilityLabel="파티 활성화">
      {activation.state === 'none' ? (
        <View style={styles.openRow}>
          <View style={styles.grow}>
            <Button
              full
              icon="pin"
              onPress={() => {
                openParty(steps);
              }}
            >
              파티 활성화
            </Button>
          </View>
          <HelpButton help={ACTIVATION_HELP} size={20} />
        </View>
      ) : (
        <LiveCard {...steps} activation={activation} />
      )}
      <LocationExplanation
        blocked={sharing.blocked}
        onAllow={sharing.allow}
        onLater={sharing.later}
        visible={sharing.explaining}
      />
    </View>
  );
}

const FACE_RING = 2;

const styles = StyleSheet.create({
  openRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  grow: { flex: 1 },
  card: { gap: space[3] },
  live: {
    borderWidth: 2,
    borderColor: color.snuBlue,
    boxShadow: `0 0 0 4px ${color.blue100}, ${shadow.float}`,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  liveWords: { fontFamily: font.bold, fontSize: 15, lineHeight: 22, color: color.ink },
  people: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  faces: { flexDirection: 'row' },
  face: { borderWidth: FACE_RING, borderColor: color.surface, borderRadius: 999 },
  overlap: { marginLeft: -6 - FACE_RING },
  peopleWords: { flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  off: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  offWords: { flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
