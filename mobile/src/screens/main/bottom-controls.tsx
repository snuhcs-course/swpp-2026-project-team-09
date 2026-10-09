// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-08, prompted by AhnJinYoung and fyoon46
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, color, mapText, onKey, radius, shadow, space, useNotReadyToast } from '@/design-system';
import type { FootprintsView } from '@/features/footprints/adapter';
import { useFootprints } from '@/features/footprints/use-footprints';
import type { ActivePartyView } from '@/features/parties/adapter';
import { useActiveParty } from '@/features/parties/use-active-party';
import { AiInput } from './ai-input';
import { BUTTON_ROW, footprintsForm, type Room } from './layout';

interface ButtonProps<Shown> {
  view: Shown;
  onPress: () => void;
}

interface FootprintsProps extends ButtonProps<FootprintsView> {
  form: ReturnType<typeof footprintsForm>;
}

interface BottomControlsProps {
  cardOpen: boolean;
  // "활성 파티": the room of the User's Party's Quest.
  onActiveParty: () => void;
  // The room the row of buttons has: "오늘의 발자국" gives way on a narrow screen.
  room: Room;
}

// "오늘의 발자국": the faces of up to three Friends who left a story today, the name, how many Friends did, and the
// round with the play mark. Until that is known, and when nobody did, it has its name and the play mark alone. On a
// narrow screen it gives way to "활성 파티": `form` says what it still shows, and it is the one that shrinks.
function FootprintsButton({ view, form, onPress }: FootprintsProps): ReactElement {
  const faces = view.faces.slice(0, form.faces);
  return (
    <Pressable
      accessibilityLabel="오늘의 발자국 재생 · 친구들의 오늘 스토리"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.footprints, pressed && styles.footprintsPressed]}
    >
      {faces.length === 0 ? null : (
        // The faces are decoration: the button is read by its own name.
        <View aria-hidden style={styles.faces}>
          {faces.map(({ id, name, photo }, index) => (
            <View key={id} style={[styles.face, index > 0 && styles.faceOver]}>
              <Avatar name={name} size="sm" source={photo === null ? undefined : { uri: photo }} />
            </View>
          ))}
        </View>
      )}
      <View style={styles.footprintsWords}>
        <Text numberOfLines={1} style={styles.footprintsTitle}>
          오늘의 발자국
        </Text>
        {view.line === '' || !form.line ? null : (
          <Text numberOfLines={1} style={styles.footprintsLine}>
            {view.line}
          </Text>
        )}
      </View>
      <View style={styles.play}>
        <View style={styles.playMark} />
      </View>
    </Pressable>
  );
}

// "활성 파티": the Party the User is in now, with the dot that says it is live and how many of its members share
// their position. Its two lines stay whole on a narrow phone: "오늘의 발자국" gives way, where the frame lets this one
// shrink.
function ActivePartyButton({ view, onPress }: ButtonProps<ActivePartyView>): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`활성 파티 ${view.title} 열기`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.party, pressed && styles.partyPressed]}
    >
      <View style={styles.live} />
      <View>
        <Text numberOfLines={1} style={styles.partyTitle}>
          활성 파티
        </Text>
        <Text numberOfLines={1} style={styles.partyLine}>
          {view.line}
        </Text>
      </View>
    </Pressable>
  );
}

// What the `Main` frame puts between the map and the navigation: the row of "오늘의 발자국" and "활성 파티", and the
// AI input under them; the 편의기능 button at the row's right is `LayerControls`. "활성 파티", shown only while the
// User is in a Party, opens its room; each of the others belongs to another task and says that it is not ready. While
// a card is open the row is not shown, as in the frame; the AI input stays.
export function BottomControls({ cardOpen, onActiveParty, room }: BottomControlsProps): ReactElement {
  const footprints = useFootprints();
  const party = useActiveParty();
  const showNotReady = useNotReadyToast();
  const form = footprintsForm(room, party !== null);
  return (
    <>
      {cardOpen ? null : (
        <View style={styles.row}>
          <FootprintsButton form={form} onPress={showNotReady} view={footprints} />
          {party === null ? null : <ActivePartyButton onPress={onActiveParty} view={party} />}
        </View>
      )}
      <AiInput />
    </>
  );
}

const FACE_OVER = -10;
const PLAY = 24;
const PLAY_MARK = 10;
const LIVE = 8;
const WORDS_GAP = 6;

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    right: BUTTON_ROW.right,
    bottom: BUTTON_ROW.bottom,
    left: BUTTON_ROW.left,
    flexDirection: 'row',
    alignItems: 'center',
    gap: BUTTON_ROW.gap,
    height: BUTTON_ROW.height,
    pointerEvents: 'box-none',
  },
  // The one button of the row that shrinks: its name is cut with an ellipsis before "활성 파티" loses a letter.
  footprints: {
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'center',
    gap: space[2],
    minWidth: 0,
    height: BUTTON_ROW.height,
    paddingRight: 14,
    paddingLeft: space[2],
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  footprintsPressed: { backgroundColor: color.surfaceSunken },
  faces: { flexDirection: 'row' },
  face: { borderRadius: radius.full, boxShadow: shadow.faceRing },
  faceOver: { marginLeft: FACE_OVER },
  footprintsWords: { flexShrink: 1, alignItems: 'flex-start', minWidth: 0 },
  footprintsTitle: { ...mapText.buttonTitle, color: color.ink },
  footprintsLine: { ...mapText.buttonLine, color: color.inkMuted },
  play: {
    alignItems: 'center',
    justifyContent: 'center',
    width: PLAY,
    height: PLAY,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  // The frame's filled triangle, 10 by 10, which the design system's line icons cannot draw: a border's corner, set
  // 2 to the right so that it looks centred.
  playMark: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderTopWidth: PLAY_MARK / 2,
    borderBottomWidth: PLAY_MARK / 2,
    borderLeftWidth: PLAY_MARK,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: color.onPrimary,
  },
  party: {
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    gap: WORDS_GAP,
    height: BUTTON_ROW.height,
    paddingRight: 10,
    paddingLeft: 9,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
    boxShadow: shadow.floatKey,
  },
  partyPressed: { backgroundColor: color.snuBluePressed },
  live: {
    width: LIVE,
    height: LIVE,
    borderRadius: radius.full,
    backgroundColor: onKey.live,
    boxShadow: `0 0 0 3px ${onKey.liveRing}`,
  },
  partyTitle: { ...mapText.smallTitle, color: color.onPrimary },
  partyLine: { ...mapText.smallLine, color: onKey.textMuted },
});
