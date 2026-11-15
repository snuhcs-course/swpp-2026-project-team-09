/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, space, text } from '@/design-system';
import { LocationExplanation } from '../main/location-explanation';
import { useSharingSwitch } from './use-sharing-switch';

// The line above the Friend and 파티 switches while the Master Switch is off, which those switches then show off and
// disabled. Its 켜기 turns the Master Switch on as 내 정보's switch does, after the explanation where the location is
// not yet allowed.
export function MasterOffLine(): ReactElement {
  const sharing = useSharingSwitch();
  return (
    <>
      {sharing.on ? null : (
        <View style={styles.line}>
          <Text style={styles.words}>전체 위치 공유가 꺼져 있어요 · </Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={space[3]}
            onPress={() => {
              sharing.change(true);
            }}
          >
            <Text style={styles.link}>켜기</Text>
          </Pressable>
        </View>
      )}
      <LocationExplanation
        blocked={sharing.blocked}
        onAllow={sharing.allow}
        onLater={sharing.later}
        visible={sharing.explaining}
      />
    </>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingVertical: space[2] },
  words: { ...text.caption, color: color.inkMuted },
  link: { ...text.caption, fontFamily: font.semiBold, color: color.snuBlue },
});
