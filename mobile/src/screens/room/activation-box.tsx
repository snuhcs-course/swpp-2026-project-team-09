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
import type { ActivationView, PartyPerson, RoomView } from '@/features/quests/room-adapter';
import { opensParty } from '@/features/quests/rules';
import { myUserId } from '@/auth/sign-in';
import { LiveDot } from '../party/live-dot';
import type { Ask } from './confirm-sheet';
import { ACTIVATION_HELP, HelpButton } from './help-bubble';
import { leaveAsk } from './party-asks';
import { type PartyEntry, usePartyEntry } from './use-party-entry';
import type { RoomActions } from './use-room-actions';

interface ActivationBoxProps {
  room: RoomView;
  actions: RoomActions;
  onAsk: (ask: Ask) => void;
}

interface Steps extends ActivationBoxProps {
  entry: PartyEntry;
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
          props.entry.shareAgain(switchOn);
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
        props.entry.join(partyId, title, props.room.otherParty);
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
  const entry = usePartyEntry(props.onAsk);
  const steps: Steps = { ...props, entry };
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
                entry.open(room.quest, room.otherParty, true);
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
      {entry.explanation}
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
