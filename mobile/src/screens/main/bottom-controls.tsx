import type { ReactElement } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Avatar,
  ChatInput,
  color,
  Icon,
  mapText,
  onKey,
  radius,
  shadow,
  space,
  useNotReadyToast,
} from '@/design-system';
import type { FootprintsView } from '@/features/footprints/adapter';
import { useFootprints } from '@/features/footprints/use-footprints';
import type { ActivePartyView } from '@/features/parties/adapter';
import { useActiveParty } from '@/features/parties/use-active-party';
import { AI_INPUT, BUTTON_ROW, LAYERS_BUTTON } from './layout';

interface ButtonProps<Shown> {
  view: Shown;
  onPress: () => void;
}

// "오늘의 발자국": the faces of up to three Friends who left a story today, the name, how many Friends did, and the
// round with the play mark. Until that is known, and when nobody did, it has its name and the play mark alone.
function FootprintsButton({ view, onPress }: ButtonProps<FootprintsView>): ReactElement {
  return (
    <Pressable
      accessibilityLabel="오늘의 발자국 재생 · 친구들의 오늘 스토리"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.footprints, pressed && styles.footprintsPressed]}
    >
      {view.faces.length === 0 ? null : (
        // The faces are decoration: the button is read by its own name.
        <View aria-hidden style={styles.faces}>
          {view.faces.map(({ id, name, photo }, index) => (
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
        {view.line === '' ? null : (
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
// their position. On a narrow phone it is the one that gives way, as in the frame.
function ActivePartyButton({ view, onPress }: ButtonProps<ActivePartyView>): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`활성 파티 ${view.title} 열기`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.party, pressed && styles.partyPressed]}
    >
      <View style={styles.live} />
      <View style={styles.partyWords}>
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

// The AI input. The chat it opens belongs to another task: a touch and a sent message say so, and the keyboard is
// put away at once, so that it never stays up over the map.
function AiInput(): ReactElement {
  const showNotReady = useNotReadyToast();
  const say = (): void => {
    showNotReady();
    Keyboard.dismiss();
  };
  return (
    <View style={styles.input} testID="ai-input">
      <ChatInput floating label="AI에게 메시지" onFocus={say} onSend={say} />
    </View>
  );
}

// What the `Main` frame puts between the map and the navigation: the row of "오늘의 발자국" and "활성 파티", the
// 편의기능 button at its right, and the AI input under them. Each belongs to another task and says that it is not
// ready. "활성 파티" is shown only while the User is in a Party. While a card is open the row and the 편의기능
// button are not shown, as in the frame; the AI input stays.
export function BottomControls({ cardOpen }: { cardOpen: boolean }): ReactElement {
  const footprints = useFootprints();
  const party = useActiveParty();
  const showNotReady = useNotReadyToast();
  return (
    <>
      {cardOpen ? null : (
        <View style={styles.row}>
          <FootprintsButton onPress={showNotReady} view={footprints} />
          {party === null ? null : <ActivePartyButton onPress={showNotReady} view={party} />}
        </View>
      )}
      {cardOpen ? null : (
        <Pressable
          accessibilityLabel="편의기능 (식당 · 셔틀버스 · 공부공간)"
          accessibilityRole="button"
          accessibilityState={{ expanded: false }}
          onPress={showNotReady}
          style={({ pressed }) => [styles.layers, pressed && styles.footprintsPressed]}
        >
          <Icon color={color.snuBlue} name="layers" size={22} />
        </Pressable>
      )}
      <AiInput />
    </>
  );
}

const FACE_OVER = -10;
const PLAY = 24;
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
  footprints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
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
  footprintsWords: { alignItems: 'flex-start' },
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
  // The frame's filled triangle of 10, which the design system's line icons cannot draw: a border's corner, set 1
  // to the right so that it looks centred.
  playMark: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 7,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: color.onPrimary,
  },
  party: {
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'center',
    gap: WORDS_GAP,
    minWidth: 0,
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
  partyWords: { flexShrink: 1, minWidth: 0 },
  partyTitle: { ...mapText.smallTitle, color: color.onPrimary },
  partyLine: { ...mapText.smallLine, color: onKey.textMuted },
  layers: {
    position: 'absolute',
    right: LAYERS_BUTTON.right,
    bottom: LAYERS_BUTTON.bottom,
    alignItems: 'center',
    justifyContent: 'center',
    width: LAYERS_BUTTON.size,
    height: LAYERS_BUTTON.size,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  input: { position: 'absolute', right: AI_INPUT.side, bottom: AI_INPUT.bottom, left: AI_INPUT.side },
});
