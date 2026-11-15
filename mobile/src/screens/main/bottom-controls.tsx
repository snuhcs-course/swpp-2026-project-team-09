/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, mapText, onKey, radius, shadow } from '@/design-system';
import type { ActivePartyView } from '@/features/parties/adapter';
import { useActiveParty } from '@/features/parties/use-active-party';
import { BUTTON_ROW } from './layout';

interface ButtonProps<Shown> {
  view: Shown;
  onPress: () => void;
}

interface BottomControlsProps {
  cardOpen: boolean;
  // "활성 파티": the room of the User's Party's Quest.
  onActiveParty: () => void;
}

// "활성 파티": the Party the User is in now, with the dot that says it is live and how many of its members share
// their position. Its two lines stay whole on a narrow phone.
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

// The row of buttons above the AI input (`MapBottom`): "활성 파티", shown only while the User is in a Party, which
// opens its room. The 편의기능 button at the row's right is `LayerControls`. While a card is open the row is not shown,
// as in the frame.
export function BottomControls({ cardOpen, onActiveParty }: BottomControlsProps): ReactElement | null {
  const party = useActiveParty();
  if (cardOpen || party === null) {
    return null;
  }
  return (
    <View style={styles.row}>
      <ActivePartyButton onPress={onActiveParty} view={party} />
    </View>
  );
}

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
